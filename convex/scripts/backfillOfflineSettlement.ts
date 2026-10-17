// convex/lib/admin/bookings/scripts.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const backfillOfflineSettlement = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        note: v.string(),
        dryRun: v.optional(v.boolean()), // defaults to true
    },
    handler: async (ctx, { bookingId, note, dryRun = true }) => {
        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        if (booking.status !== "COMPLETED")
            throw new Error(`Status is ${booking.status}, expected COMPLETED`);
        if (booking.paymentPhase !== "UPFRONT_PAID")
            throw new Error(`paymentPhase is ${booking.paymentPhase}`);
        if (booking.completedAt)
            throw new Error("Already has completedAt, nothing to fix");

        const existingFinal = await ctx.db
            .query("transactions")
            .withIndex("by_booking_phase", q =>
                q.eq("bookingId", bookingId).eq("phase", "FINAL"),
            )
            .first();
        if (existingFinal)
            throw new Error("A FINAL transaction already exists");

        const service = await ctx.db.get(booking.serviceId);
        const amount = booking.remainingDueAmount;
        const completedAt =
            booking.disputeResolution?.resolvedAt ?? booking.updatedAt;
        const offlineId = `offline_${booking.orderNo}_final`;

        const plan = {
            orderNo: booking.orderNo,
            completedAt: new Date(completedAt).toISOString(),
            paymentPhase: "UPFRONT_PAID -> FULLY_SETTLED",
            transaction: `FINAL / OFFLINE / $${(amount / 100).toFixed(2)} to creative, $0 to Wondar`,
            serviceTimesCompleted: service
                ? `${service.stats.timesCompleted} -> ${service.stats.timesCompleted + 1}`
                : "service not found",
        };

        if (dryRun) return { dryRun: true, plan };

        const now = Date.now();

        await ctx.db.patch(bookingId, {
            completedAt,
            completedBy: "SYSTEM",
            paymentPhase: "FULLY_SETTLED",
            updatedAt: now,
        });

        if (service) {
            await ctx.db.patch(service._id, {
                stats: {
                    ...service.stats,
                    timesCompleted: service.stats.timesCompleted + 1,
                },
            });
        }

        await ctx.db.insert("transactions", {
            bookingId,
            clientId: booking.clientId,
            creativeId: booking.creativeId,
            serviceId: booking.serviceId,
            phase: "FINAL",
            sequence: 2,
            stripePaymentIntentId: offlineId, // placeholder, never a pi_ value
            currency: booking.currency || "usd",
            subtotal: 0,
            travelFee: 0,
            totalCharged: amount,
            creativeEarnings: amount,
            platformEarnings: 0,
            status: "SUCCEEDED",
            completedAt,
            source: "OFFLINE",
            offlineNote: note,
            metadata: service ? { serviceName: service.name } : undefined,
        });

        return { dryRun: false, plan };
    },
});
