import { v } from "convex/values";
import { query, action } from "../../_generated/server";
import Stripe from "stripe";
import { getAuthUserId } from "../../../convex/auth";

// Initialize Stripe
const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not set");
    }
    return new Stripe(secretKey, {
        apiVersion: "2026-03-25.dahlia",
    });
};

// ==========================================
// QUERIES
// ==========================================

/**
 * Get earnings summary for a creative
 */
export const getEarningsSummary = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const now = Date.now();
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const lastMonthStart = new Date(thisMonthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

        const lastMonthEnd = new Date(thisMonthStart);
        lastMonthEnd.setMilliseconds(-1);

        // Get all completed transactions for this creative
        const allTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("status"), "SUCCEEDED"))
            .collect();

        // Calculate totals
        let totalEarnings = 0;
        let thisMonthEarnings = 0;
        let lastMonthEarnings = 0;
        let pendingBalance = 0;

        for (const tx of allTransactions) {
            totalEarnings += tx.creativeEarnings;

            if (tx.createdAt >= thisMonthStart.getTime()) {
                thisMonthEarnings += tx.creativeEarnings;
            } else if (
                tx.createdAt >= lastMonthStart.getTime() &&
                tx.createdAt <= lastMonthEnd.getTime()
            ) {
                lastMonthEarnings += tx.creativeEarnings;
            }

            // Pending if completed within last 7 days (payout delay)
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            if (tx.completedAt && tx.completedAt >= sevenDaysAgo) {
                pendingBalance += tx.creativeEarnings;
            }
        }

        const availableBalance = totalEarnings - pendingBalance;

        return {
            availableBalance: Math.max(0, availableBalance),
            pendingBalance,
            totalEarnings,
            totalTransactions: allTransactions.length,
            thisMonthEarnings,
            lastMonthEarnings,
            currency: "USD",
        };
    },
});

/**
 * Get recent transactions for a creative
 */
export const getRecentTransactions = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 10;

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", args.userId))
            .order("desc")
            .take(limit);

        return transactions;
    },
});

/**
 * Get all transactions for a creative with pagination
 */
export const getTransactions = query({
    args: {
        status: v.optional(
            v.union(
                v.literal("PENDING"),
                v.literal("PROCESSING"),
                v.literal("SUCCEEDED"),
                v.literal("FAILED"),
                v.literal("REFUNDED"),
                v.literal("PARTIALLY_REFUNDED"),
            ),
        ),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const limit = args.limit ?? 20;

        let query = ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId));

        if (args.status) {
            query = query.filter(q => q.eq(q.field("status"), args.status));
        }

        const transactions = await query.order("desc").take(limit + 1);

        const hasMore = transactions.length > limit;
        const items = hasMore ? transactions.slice(0, limit) : transactions;

        return {
            items,
            hasMore,
            nextCursor: hasMore ? items[items.length - 1]._id : undefined,
        };
    },
});

/**
 * Get transaction by ID
 */
export const getTransactionById = query({
    args: { transactionId: v.id("transactions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.transactionId);
    },
});

/**
 * Get payouts for a creative
 */
export const getPayouts = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const limit = args.limit ?? 20;

        const payouts = await ctx.db
            .query("payouts")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .order("desc")
            .take(limit);

        return payouts;
    },
});

/**
 * Get payout by ID
 */
export const getPayoutById = query({
    args: { payoutId: v.id("payouts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.payoutId);
    },
});

// ==========================================
// ACTIONS (External API calls)
// ==========================================

/**
 * Get balance from Stripe for a connected account
 */
export const getStripeBalance = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        const balance = await stripe.balance.retrieve(
            {},
            {
                stripeAccount: args.stripeAccountId,
            },
        );

        // Get available and pending in default currency (usually USD)
        const available =
            balance.available.find(b => b.currency === "usd")?.amount ?? 0;
        const pending =
            balance.pending.find(b => b.currency === "usd")?.amount ?? 0;

        return {
            available,
            pending,
            currency: "usd",
        };
    },
});

/**
 * Get payouts from Stripe for a connected account
 */
export const getStripePayouts = action({
    args: {
        stripeAccountId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        const payouts = await stripe.payouts.list(
            {
                limit: args.limit ?? 10,
            },
            {
                stripeAccount: args.stripeAccountId,
            },
        );

        return payouts.data.map(payout => ({
            id: payout.id,
            amount: payout.amount,
            currency: payout.currency,
            status: payout.status,
            arrivalDate: payout.arrival_date,
            created: payout.created,
            method: payout.method,
            type: payout.type,
        }));
    },
});
