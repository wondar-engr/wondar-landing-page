// Add this query to your existing profiles.ts file

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get Stripe account by userId
 */
export const getStripeAccount = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .unique();

        return account;
    },
});

export const getBookingForPaymentInternal = internalQuery({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        return await ctx.db.get(bookingId);
    },
});
