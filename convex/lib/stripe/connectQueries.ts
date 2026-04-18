import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";
import { getAuthUserId } from "../../../convex/auth";

// ==========================================
// PUBLIC QUERIES
// ==========================================

export const getStripeAccount = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const account = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        return account;
    },
});

export const hasStripeAccount = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .first();

        return {
            hasAccount: !!account,
            isActive: account?.status === "ACTIVE",
            status: account?.status ?? null,
        };
    },
});

// ==========================================
// INTERNAL QUERIES
// ==========================================

export const getStripeAccountByUserId = internalQuery({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .first();
    },
});

export const getStripeAccountByStripeId = internalQuery({
    args: {
        stripeAccountId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .first();
    },
});

export const getAllRestrictedAccounts = internalQuery({
    args: {},
    handler: async ctx => {
        return await ctx.db
            .query("stripeAccounts")
            .filter(q =>
                q.or(
                    q.eq(q.field("status"), "PENDING"),
                    q.eq(q.field("status"), "RESTRICTED"),
                ),
            )
            .collect();
    },
});

// Add this internal query
export const getAllStripeAccountIds = internalQuery({
    args: {},
    handler: async ctx => {
        return await ctx.db.query("stripeAccounts").collect();
    },
});
