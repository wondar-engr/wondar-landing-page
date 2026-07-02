import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

// ── Get all transactions for a booking ───────────────────────────
export const getTransactionsByBooking = internalQuery({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transactions")
            .withIndex("by_bookingId", q => q.eq("bookingId", args.bookingId))
            .collect();
    },
});

// ── Get upfront transaction only ──────────────────────────────────
export const getUpfrontTransaction = internalQuery({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transactions")
            .withIndex("by_booking_phase", q =>
                q.eq("bookingId", args.bookingId).eq("phase", "UPFRONT"),
            )
            .first();
    },
});

// ── Get final transaction only ────────────────────────────────────
export const getFinalTransaction = internalQuery({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transactions")
            .withIndex("by_booking_phase", q =>
                q.eq("bookingId", args.bookingId).eq("phase", "FINAL"),
            )
            .first();
    },
});

// ── Get transaction by Stripe payment intent ──────────────────────
export const getTransactionByPaymentIntent = internalQuery({
    args: {
        stripePaymentIntentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .first();
    },
});
