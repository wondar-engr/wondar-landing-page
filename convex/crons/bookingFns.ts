import { sendNotification } from "../lib/notifications";
import { internalMutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";
import { bookingStartToUtcMs, bookingEndToUtcMs } from "@convex/utils/time";
import { getBookingContext } from "./bookingContext";

const GRACE_CREATIVE_NO_SHOW_MS = 30 * 60 * 1000;
const GRACE_AUTO_COMPLETE_MS = 60 * 60 * 1000;
const GRACE_UNPAID_FINAL_MS = 20 * 60 * 1000;
const DISPUTE_OVERDUE_MS = 48 * 60 * 60 * 1000;

export const processBookingLifecycle = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        // Only the statuses the steps below act on. Settled, completed, cancelled
        // and refunded bookings are never loaded.
        const ACTIVE_STATUSES = [
            "PENDING",
            "CONFIRMED",
            "PAID",
            "IN_PROGRESS",
            "DISPUTE",
        ] as const;

        const activeBookings = (
            await Promise.all(
                ACTIVE_STATUSES.map(status =>
                    ctx.db
                        .query("bookings")
                        .withIndex("by_status", q => q.eq("status", status))
                        .collect(),
                ),
            )
        ).flat();

        for (const booking of activeBookings) {
            const clientTimezone = booking.clientTimezone ?? "UTC";
            const startMs = bookingStartToUtcMs(
                booking.dateBooked,
                booking.startTime,
                clientTimezone,
            );
            const endMs = bookingEndToUtcMs(
                booking.dateBooked,
                booking.endTime,
                clientTimezone,
            );

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
                        category: "BOOKINGS",
                    },
                );

                continue;
            }

            // ── 2a. CONFIRMED + UPFRONT_PENDING — client never paid ───
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
                        category: "BOOKINGS",
                    },
                );

                continue;
            }

            // ── 2b. PAID — balance still unpaid after start + grace ───
            if (
                booking.status === "PAID" &&
                booking.paymentPhase === "UPFRONT_PAID" &&
                now > startMs + GRACE_UNPAID_FINAL_MS
            ) {
                await ctx.db.patch(booking._id, {
                    status: "DISPUTE",
                    disputeReason: "CLIENT_NO_PAY",
                    disputeOpenedBy: "SYSTEM",
                    disputeOpenedAt: now,
                    updatedAt: now,
                });

                const ctx_ = await getBookingContext(ctx, booking);
                const due = `$${(booking.remainingDueAmount / 100).toFixed(2)}`;

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Under Review",
                    body: `Your booking for "${ctx_.serviceName}" was flagged because the remaining ${due} wasn't paid. Our team will review it within 48 hours.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Flagged — Balance Unpaid",
                    body: `${ctx_.clientName} didn't pay the remaining balance for "${ctx_.serviceName}", so the service couldn't start. Our team will review within 48 hours.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `💸 BALANCE UNPAID — Dispute Auto-Opened`,
                            ``,
                            `📋 Booking ID: ${booking._id}`,
                            `🎨 Creative:   ${ctx_.creativeName}`,
                            `👤 Client:     ${ctx_.clientName}`,
                            `🛠 Service:    ${ctx_.serviceName}`,
                            `📅 Date:       ${ctx_.serviceDate}`,
                            `🕐 Time:       ${ctx_.timeWindow}`,
                            ``,
                            `💰 Unpaid: ${due}`,
                            `   Booking fee paid. Balance unpaid 20 min after start.`,
                            ``,
                            `🔧 Action needed: decide full / partial / no refund.`,
                        ].join("\n"),
                        category: "DISPUTES",
                    },
                );

                continue;
            }

            // ── 3. PAID — creative no-show (30min grace) ─────────────
            if (
                (booking.status === "CONFIRMED" || booking.status === "PAID") &&
                booking.paymentPhase === "FULLY_SETTLED" &&
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
                            `   Client paid in full. Creative never started.`,
                            `   Grace period (30 min) elapsed.`,
                            ``,
                            `🔧 Action needed: Review and process refund if applicable.`,
                        ].join("\n"),
                        category: "DISPUTES",
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
                            category: "ACCOUNTS",
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
                const settled = booking.paymentPhase === "FULLY_SETTLED";
                await ctx.db.patch(booking._id, {
                    status: "COMPLETED",
                    ...(!settled && { paymentPhase: "FINAL_PENDING" as const }),
                    completedAt: now,
                    completedBy: "SYSTEM",
                    updatedAt: now,
                });

                const service = await ctx.db.get(booking.serviceId);
                if (service) {
                    await ctx.db.patch(service._id, {
                        stats: {
                            ...service.stats,
                            timesCompleted:
                                (service.stats.timesCompleted ?? 0) + 1,
                        },
                    });
                }

                const ctx_ = await getBookingContext(ctx, booking);

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Service Complete",
                    body: settled
                        ? `Your session for "${ctx_.serviceName}" is complete. How did it go? Leave a review!`
                        : `Your session for "${ctx_.serviceName}" is complete. Please complete your final payment.`,
                    type: "BOOKING",
                    meta: {
                        screen: "booking_detail",
                        id: booking._id,
                        ...(!settled && { action: "PAY_FINAL" }),
                    },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Service Auto-Completed",
                    body: settled
                        ? `Your session with ${ctx_.clientName} was auto-completed.`
                        : `Your session with ${ctx_.clientName} was auto-completed. Awaiting their final payment.`,
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
                            settled
                                ? `   Already fully paid.`
                                : `   Awaiting client's final payment.`,
                        ].join("\n"),
                        category: "BOOKINGS",
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
                        category: "DISPUTES",
                    },
                );
            }

            continue;
        }
    },
});
