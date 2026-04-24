import { internalMutation } from "../../../convex/_generated/server";
import { v } from "convex/values";

/**
 * Store Stripe account in database
 */
export const storeStripeAccount = internalMutation({
    args: {
        userId: v.string(),
        stripeAccountId: v.string(),
        country: v.string(),
        defaultCurrency: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if account already exists
        const existing = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .unique();

        if (existing) {
            return existing._id;
        }

        // Create new account record
        const accountId = await ctx.db.insert("stripeAccounts", {
            userId: args.userId,
            stripeAccountId: args.stripeAccountId,
            accountType: "express",
            status: "PENDING",
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            payoutSchedule: {
                interval: "WEEKLY",
                weeklyAnchor: "friday",
            },
            country: args.country,
            defaultCurrency: args.defaultCurrency,
            updatedAt: Date.now(),
        });

        return accountId;
    },
});

export const createPendingTransactionInternal = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        clientId: v.string(),
        creativeId: v.string(),
        serviceId: v.id("services"),
        stripePaymentIntentId: v.string(),
        currency: v.string(),
        phase: v.union(v.literal("UPFRONT"), v.literal("FINAL")),
        sequence: v.number(),
        totalCharged: v.number(),
        creativeEarnings: v.number(),
        platformEarnings: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .first();

        if (existing) return existing._id;

        const booking = await ctx.db.get(args.bookingId);
        if (!booking) throw new Error("Booking not found");

        return await ctx.db.insert("transactions", {
            bookingId: args.bookingId,
            clientId: args.clientId,
            creativeId: args.creativeId,
            serviceId: args.serviceId,
            stripePaymentIntentId: args.stripePaymentIntentId,
            currency: args.currency,
            phase: args.phase,
            sequence: args.sequence,
            travelFee: 0,
            subtotal: 0,
            totalCharged: args.totalCharged,
            creativeEarnings: args.creativeEarnings,
            platformEarnings: args.platformEarnings,
            status: "PENDING",
        });
    },
});

export const markPaymentIntentSucceededInternal = internalMutation({
    args: {
        stripePaymentIntentId: v.string(),
        stripeChargeId: v.optional(v.string()),
        stripeTransferId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const tx = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .first();

        if (!tx) return { ok: false };

        if (tx.status === "SUCCEEDED")
            return { ok: true, alreadyProcessed: true };

        await ctx.db.patch(tx._id, {
            status: "SUCCEEDED",
            stripeChargeId: args.stripeChargeId,
            stripeTransferId: args.stripeTransferId,
            completedAt: Date.now(),
        });

        const booking = await ctx.db.get(tx.bookingId);
        if (!booking) return { ok: false };

        if (tx.phase === "UPFRONT") {
            await ctx.db.patch(booking._id, {
                paymentPhase: "UPFRONT_PAID",
                status:
                    booking.status === "CONFIRMED" ? "PAID" : booking.status,
                updatedAt: Date.now(),
            });
        } else if (tx.phase === "FINAL") {
            await ctx.db.patch(booking._id, {
                paymentPhase: "FULLY_SETTLED",
                updatedAt: Date.now(),
            });
        }

        return { ok: true };
    },
});
