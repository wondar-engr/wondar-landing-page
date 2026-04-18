import { internalMutation } from "../../convex/_generated/server";
import { sendNotification } from "../lib/notifications";

export const checkAndUpdateBookingStatus = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const currentDate = new Date(now);
        const currentMinutes =
            currentDate.getHours() * 60 + currentDate.getMinutes();

        const todayStart = new Date(currentDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayTimestamp = todayStart.getTime();

        let startedCount = 0;
        let completedCount = 0;
        let expiredCount = 0;

        // ==========================================
        // 1. CONFIRMED → IN_PROGRESS
        // (Service time has arrived)
        // ==========================================
        const confirmedBookings = await ctx.db
            .query("bookings")
            .withIndex("by_status", q => q.eq("status", "CONFIRMED"))
            .collect();

        for (const booking of confirmedBookings) {
            const isToday = booking.dateBooked === todayTimestamp;
            const serviceStarted =
                isToday && booking.startTime <= currentMinutes;

            if (serviceStarted) {
                await ctx.db.patch(booking._id, {
                    status: "IN_PROGRESS",
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Service Started 🎬",
                    body: "Your scheduled service has started.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Service In Progress",
                    body: "Your booked service has started.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                startedCount++;
            }
        }

        // ==========================================
        // 2. IN_PROGRESS → COMPLETED
        // (Service end time + buffer passed)
        // ==========================================
        const inProgressBookings = await ctx.db
            .query("bookings")
            .withIndex("by_status", q => q.eq("status", "IN_PROGRESS"))
            .collect();

        const AUTO_COMPLETE_BUFFER = 60; // 1 hour after end time

        for (const booking of inProgressBookings) {
            const isToday = booking.dateBooked === todayTimestamp;
            const isPastDate = booking.dateBooked < todayTimestamp;
            const serviceEnded =
                isToday &&
                booking.endTime + AUTO_COMPLETE_BUFFER <= currentMinutes;

            if (isPastDate || serviceEnded) {
                await ctx.db.patch(booking._id, {
                    status: "COMPLETED",
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Service Completed! ⭐",
                    body: "How was your experience? Leave a review!",
                    type: "REVIEW",
                    meta: { screen: "booking_review", id: booking._id },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Service Completed",
                    body: "Great job! The booking has been marked as complete.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                completedCount++;
            }
        }

        // ==========================================
        // 3. PENDING → CANCELLED (Expired)
        // (Creative didn't respond within 24 hours)
        // ==========================================
        const pendingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_status", q => q.eq("status", "PENDING"))
            .collect();

        const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

        for (const booking of pendingBookings) {
            const bookingAge = now - booking._creationTime;

            if (bookingAge > PENDING_EXPIRY_MS) {
                await ctx.db.patch(booking._id, {
                    status: "CANCELLED",
                    cancel: {
                        by: "system",
                        reason: "Creative did not respond within 24 hours",
                        date: now,
                    },
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Booking Expired",
                    body: "The creative didn't respond in time. Your booking has been cancelled.",
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                expiredCount++;
            }
        }

        return { startedCount, completedCount, expiredCount };
    },
});
