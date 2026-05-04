import { sendNotification } from "../lib/notifications";
import { internalMutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";

const GRACE_CREATIVE_NO_SHOW_MS = 30 * 60 * 1000; // 30 min
const GRACE_AUTO_COMPLETE_MS = 60 * 60 * 1000; // 60 min
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

        console.log(
            `[CRON] Processing booking lifecycle. Active bookings count: ${activeBookings.length}\n`,
            `Time: ${new Date(now).toISOString()}\n`,
            `Booking IDs: ${activeBookings.map(b => b._id).join(", ")}`,
        );

        for (const booking of activeBookings) {
            const startMs = getServiceStartMs(
                booking.dateBooked,
                booking.startTime,
            );
            const endMs = getServiceEndMs(booking.dateBooked, booking.endTime);

            // ── 1. PENDING expired ──────────────────────────────────────
            if (booking.status === "PENDING" && now > startMs) {
                await ctx.db.patch(booking._id, {
                    status: "CANCELLED",
                    cancelledAt: now,
                    cancelReason: "EXPIRED_PENDING",
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Expired",
                    body: "Your booking request expired as the creative did not respond in time.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Request Expired",
                    body: "A booking request expired because you did not respond in time.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                const telegramText = `
                    Booking No: ${booking._id}
                    Status: Expired Pending
                    Client ID: ${booking.clientId}
                    Creative Business Name: ${creativeProfile?.businessName || booking.creativeId}
                    Service Date: ${new Date(booking.dateBooked).toDateString()}
                `;

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: telegramText,
                    },
                );

                continue;
            }

            // ── 2. CONFIRMED + UPFRONT_PENDING — client never paid ──────
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

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Cancelled",
                    body: "Your booking was cancelled because upfront payment was not completed.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Cancelled",
                    body: "A booking was cancelled — the client did not complete payment.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                const telegramText = `
                    Booking No: ${booking._id}
                    Status: Cancelled - Client No Payment
                    Client ID: ${booking.clientId}
                    Creative Business Name: ${creativeProfile?.businessName || booking.creativeId}
                    Service Date: ${new Date(booking.dateBooked).toDateString()}
                `;

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: telegramText,
                    },
                );

                continue;
            }

            // ── 3. PAID — creative no-show (30min grace) ────────────────
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

                // Log creative no-show flag
                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                if (creativeProfile) {
                    const currentFlags = creativeProfile.noShowCount ?? 0;
                    const newCount = currentFlags + 1;

                    await ctx.db.patch(creativeProfile._id, {
                        noShowCount: newCount,
                        // reduce visibility at threshold
                        ...(newCount >= 3 && { accountStatus: "UNDER_REVIEW" }),
                    });
                }

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Under Review",
                    body: "Your booking has been flagged for review. We'll resolve this within 48 hours.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Booking Dispute Opened",
                    body: "A booking has been flagged because the service was not started. Please submit your account.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                const telegramText = `
                    Booking No: ${booking._id}
                    Status: Dispute - Creative No Show
                    Client ID: ${booking.clientId}
                    Creative Business Name: ${creativeProfile?.businessName || booking.creativeId}
                    Service Date: ${new Date(booking.dateBooked).toDateString()}
                `;

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: telegramText,
                    },
                );

                continue;
            }

            // ── 4. IN_PROGRESS — auto-complete after end time + 60min ───
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

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Service Complete",
                    body: "Your service has been marked complete. Please complete your final payment.",
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
                    body: "Your service was automatically marked complete. Awaiting client's final payment.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                const telegramText = `
                    Booking No: ${booking._id}
                    Status: Auto-Completed
                    Client ID: ${booking.clientId}
                    Creative Business Name: ${creativeProfile?.businessName || booking.creativeId}
                    Service Date: ${new Date(booking.dateBooked).toDateString()}
                `;

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: telegramText,
                    },
                );

                continue;
            }

            // ── 5. DISPUTE overdue — past 48hrs, notify admin to resolve ‹──────────────────────────────
            if (
                booking.status === "DISPUTE" &&
                booking.disputeOpenedAt &&
                now > booking.disputeOpenedAt + DISPUTE_OVERDUE_MS &&
                !booking.disputeOverdueNotified // prevent repeat pings
            ) {
                await ctx.db.patch(booking._id, {
                    disputeOverdueNotified: true,
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Dispute Update",
                    body: "Your dispute is being reviewed. We'll resolve it shortly.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Dispute Update",
                    body: "Your dispute is being reviewed. We'll resolve it shortly.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: `🚨 OVERDUE DISPUTE\nBooking: ${booking._id}\nOpened: ${new Date(booking.disputeOpenedAt).toISOString()}\nNeeds manual resolution.`,
                    },
                );
            }

            continue;
        }
    },
});
