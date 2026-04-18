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
