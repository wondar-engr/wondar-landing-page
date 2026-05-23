import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const saveStripeCustomer = internalMutation({
    args: {
        userId: v.string(),
        stripeCustomerId: v.string(),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Guard — don't duplicate
        const existing = await ctx.db
            .query("stripeCustomers")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .first();

        if (existing) return existing._id;

        return await ctx.db.insert("stripeCustomers", {
            userId: args.userId,
            stripeCustomerId: args.stripeCustomerId,
            email: args.email,
            createdAt: Date.now(),
        });
    },
});

// ← new
export const updateDefaultPaymentMethod = internalMutation({
    args: {
        userId: v.string(),
        paymentMethodId: v.string(),
    },
    handler: async (ctx, { userId, paymentMethodId }) => {
        const customer = await ctx.db
            .query("stripeCustomers")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!customer) return;

        await ctx.db.patch(customer._id, {
            defaultPaymentMethodId: paymentMethodId,
        });
    },
});
