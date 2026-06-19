import { sendNotification } from "../lib/notifications";
import { internalMutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";
import { MutationCtx } from "../_generated/server";
import { Id } from "@convex/_generated/dataModel";

const GRACE_CREATIVE_NO_SHOW_MS = 30 * 60 * 1000;
const GRACE_AUTO_COMPLETE_MS = 60 * 60 * 1000;
const DISPUTE_OVERDUE_MS = 48 * 60 * 60 * 1000;

function getServiceStartMs(dateBooked: number, startTime: number) {
    const d = new Date(dateBooked);
    d.setHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
    return d.getTime();
}

function getServiceEndMs(dateBooked: number, endTime: number) {
    const d = new Date(dateBooked);
    d.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0);
    return d.getTime();
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

// ── Fetch rich booking context once, reuse across all actions ─────
async function getBookingContext(
    ctx: MutationCtx,
    booking: {
        clientId: string;
        creativeId: string;
        serviceId: Id<"services">;
        dateBooked: number;
        startTime: number;
        endTime: number;
    },
) {
    const [clientProfile, creativeProfile, service] = await Promise.all([
        ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.clientId))
            .first(),
        ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
            .first(),
        ctx.db.get(booking.serviceId),
    ]);

    const clientName = clientProfile
        ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
        : `Client (${booking.clientId.slice(-6)})`;

    const creativeName =
        creativeProfile?.businessName ??
        `Creative (${booking.creativeId.slice(-6)})`;

    const serviceName = service?.name ?? "Unknown Service";

    const serviceDate = new Date(booking.dateBooked).toLocaleDateString(
        "en-US",
        { weekday: "short", year: "numeric", month: "short", day: "numeric" },
    );

    const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;

    return {
        clientName,
        creativeName,
        serviceName,
        serviceDate,
        timeWindow,
        creativeProfile,
    };
}

export const processBookingLifecycle = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        const activeBookings = await ctx.db
            .query("bookings")
            .filter(q =>
                q.and(
                    q.neq(q.field("status"), "CANCELLED"),
                    q.neq(q.field("status"), "REFUNDED"),
                    q.neq(q.field("status"), "DISPUTE"),
                    q.neq(q.field("status"), "FULLY_SETTLED"),
                ),
            )
            .collect();

        for (const booking of activeBookings) {
            const startMs = getServiceStartMs(
                booking.dateBooked,
                booking.startTime,
            );
            const endMs = getServiceEndMs(booking.dateBooked, booking.endTime);

            // ── 1. PENDING expired ────────────────────────────────────
            if (booking.status === "PENDING" && now > startMs) {
                await ctx.db.patch(booking._id, {
                    status: "CANCELLED",
                    cancelledAt: now,
                    cancelReason: "EXPIRED_PENDING",
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Expired",
                    body: `Your booking for "${ctx_.serviceName}" expired — the creative did not respond in time.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Request Expired",
                    body: `A booking request from ${ctx_.clientName} for "${ctx_.serviceName}" expired because you did not respond.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `⏰ BOOKING EXPIRED — No Creative Response`,
                            ``,
                            `📋 Booking ID: ${booking._id}`,
                            `🎨 Creative:   ${ctx_.creativeName}`,
                            `👤 Client:     ${ctx_.clientName}`,
                            `🛠 Service:    ${ctx_.serviceName}`,
                            `📅 Date:       ${ctx_.serviceDate}`,
                            `🕐 Time:       ${ctx_.timeWindow}`,
                            ``,
                            `ℹ️ The creative never accepted or declined this request.`,
                            `   No payment was taken.`,
                        ].join("\n"),
                    },
                );

                continue;
            }

            // ── 2. CONFIRMED + UPFRONT_PENDING — client never paid ───
            if (
                booking.status === "CONFIRMED" &&
                booking.paymentPhase === "UPFRONT_PENDING" &&
                now > startMs
            ) {
                await ctx.db.patch(booking._id, {
                    status: "CANCELLED",
                    cancelledAt: now,
                    cancelReason: "CLIENT_NO_PAYMENT",
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Cancelled",
                    body: `Your booking for "${ctx_.serviceName}" was cancelled — upfront payment was not completed in time.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Cancelled",
                    body: `The booking from ${ctx_.clientName} for "${ctx_.serviceName}" was cancelled — client did not complete payment.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `💸 BOOKING CANCELLED — Client Did Not Pay`,
                            ``,
                            `📋 Booking ID: ${booking._id}`,
                            `🎨 Creative:   ${ctx_.creativeName}`,
                            `👤 Client:     ${ctx_.clientName}`,
                            `🛠 Service:    ${ctx_.serviceName}`,
                            `📅 Date:       ${ctx_.serviceDate}`,
                            `🕐 Time:       ${ctx_.timeWindow}`,
                            ``,
                            `ℹ️ Creative had accepted. Client never paid the upfront.`,
                            `   No charge was made.`,
                        ].join("\n"),
                    },
                );

                continue;
            }

            // ── 3. PAID — creative no-show (30min grace) ─────────────
            if (
                (booking.status === "CONFIRMED" || booking.status === "PAID") &&
                booking.paymentPhase === "UPFRONT_PAID" &&
                now > startMs + GRACE_CREATIVE_NO_SHOW_MS
            ) {
                await ctx.db.patch(booking._id, {
                    status: "DISPUTE",
                    disputeReason: "CREATIVE_NO_SHOW",
                    disputeOpenedAt: now,
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);
                let accountFlagged = false;
                let newNoShowCount = 0;

                if (ctx_.creativeProfile) {
                    newNoShowCount =
                        (ctx_.creativeProfile.noShowCount ?? 0) + 1;
                    const shouldFlag = newNoShowCount >= 3;

                    await ctx.db.patch(ctx_.creativeProfile._id, {
                        noShowCount: newNoShowCount,
                        ...(shouldFlag && { accountStatus: "UNDER_REVIEW" }),
                    });

                    accountFlagged = shouldFlag;
                }

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Under Review",
                    body: `Your booking for "${ctx_.serviceName}" has been flagged. We'll resolve this within 48 hours.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Dispute Opened — No Show",
                    body: `A dispute was opened for your booking with ${ctx_.clientName}. The service was not started on time.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                if (accountFlagged) {
                    await sendNotification(ctx, {
                        userId: booking.creativeId,
                        title: "Account Under Review ⚠️",
                        body: "Your account has been placed under review due to multiple missed bookings. Please contact support.",
                        type: "GENERAL",
                        meta: { screen: "help" },
                    });
                }

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `🚫 CREATIVE NO-SHOW — Dispute Auto-Opened`,
                            ``,
                            `📋 Booking ID:  ${booking._id}`,
                            `🎨 Creative:    ${ctx_.creativeName}`,
                            `👤 Client:      ${ctx_.clientName}`,
                            `🛠 Service:     ${ctx_.serviceName}`,
                            `📅 Date:        ${ctx_.serviceDate}`,
                            `🕐 Time:        ${ctx_.timeWindow}`,
                            ``,
                            `⚠️ No-Show Count: ${newNoShowCount}`,
                            `   Client paid upfront. Creative never started.`,
                            `   Grace period (30 min) elapsed.`,
                            ``,
                            `🔧 Action needed: Review and process refund if applicable.`,
                        ].join("\n"),
                    },
                );

                if (accountFlagged) {
                    await ctx.scheduler.runAfter(
                        0,
                        internal.lib.appActions.notifications
                            .sendTelegramNotification,
                        {
                            text: [
                                `🔴 ACCOUNT FLAGGED — UNDER REVIEW`,
                                ``,
                                `🎨 Creative:      ${ctx_.creativeName}`,
                                `🆔 User ID:       ${booking.creativeId}`,
                                `📊 No-Show Count: ${newNoShowCount} (threshold: 3)`,
                                ``,
                                `📋 Triggered by Booking: ${booking._id}`,
                                `👤 Affected Client:      ${ctx_.clientName}`,
                                `🛠 Service:              ${ctx_.serviceName}`,
                                ``,
                                `🔧 Manual review required. Account visibility reduced.`,
                            ].join("\n"),
                        },
                    );
                }

                continue;
            }

            // ── 4. IN_PROGRESS — auto-complete after end + 60min ─────
            if (
                booking.status === "IN_PROGRESS" &&
                now > endMs + GRACE_AUTO_COMPLETE_MS
            ) {
                await ctx.db.patch(booking._id, {
                    status: "COMPLETED",
                    paymentPhase: "FINAL_PENDING",
                    completedAt: now,
                    completedBy: "SYSTEM",
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Service Complete",
                    body: `Your session for "${ctx_.serviceName}" is complete. Please complete your final payment.`,
                    type: "BOOKING",
                    meta: {
                        screen: "booking_detail",
                        id: booking._id,
                        action: "PAY_FINAL",
                    },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Service Auto-Completed",
                    body: `Your session with ${ctx_.clientName} was auto-completed. Awaiting their final payment.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `✅ SERVICE AUTO-COMPLETED`,
                            ``,
                            `📋 Booking ID: ${booking._id}`,
                            `🎨 Creative:   ${ctx_.creativeName}`,
                            `👤 Client:     ${ctx_.clientName}`,
                            `🛠 Service:    ${ctx_.serviceName}`,
                            `📅 Date:       ${ctx_.serviceDate}`,
                            `🕐 Time:       ${ctx_.timeWindow}`,
                            ``,
                            `ℹ️ Neither party marked the service complete.`,
                            `   System auto-completed after 60 min grace.`,
                            `   Awaiting client's final payment.`,
                        ].join("\n"),
                    },
                );

                continue;
            }

            // ── 5. DISPUTE overdue — past 48hrs ───────────────────────
            if (
                booking.status === "DISPUTE" &&
                booking.disputeOpenedAt &&
                now > booking.disputeOpenedAt + DISPUTE_OVERDUE_MS &&
                !booking.disputeOverdueNotified
            ) {
                await ctx.db.patch(booking._id, {
                    disputeOverdueNotified: true,
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);
                const openedAt = new Date(
                    booking.disputeOpenedAt,
                ).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Dispute Update",
                    body: "Your dispute is being reviewed by our team. We'll resolve it shortly.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Dispute Update",
                    body: "Your dispute is being reviewed by our team. We'll resolve it shortly.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `🚨 OVERDUE DISPUTE — Needs Manual Resolution`,
                            ``,
                            `📋 Booking ID:    ${booking._id}`,
                            `🎨 Creative:      ${ctx_.creativeName}`,
                            `👤 Client:        ${ctx_.clientName}`,
                            `🛠 Service:       ${ctx_.serviceName}`,
                            `📅 Service Date:  ${ctx_.serviceDate}`,
                            `🕐 Time:          ${ctx_.timeWindow}`,
                            ``,
                            `⏱ Dispute Opened: ${openedAt}`,
                            `   Both parties notified. 48hr window elapsed.`,
                            ``,
                            `🔧 Immediate action required. Resolve manually.`,
                        ].join("\n"),
                    },
                );
            }

            continue;
        }
    },
});
