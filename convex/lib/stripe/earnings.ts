import { v } from "convex/values";
import { query, action } from "../../_generated/server";
import Stripe from "stripe";
import { getAuthUserId } from "../../../convex/auth";
import { getProfileByUserId } from "@convex/utils/helpers/profile";
import { paginationOptsValidator } from "convex/server";
import { TransactionStatusUnion } from "@convex/unions";

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

export const getEarningsSummary2 = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        // ── Real balance from Stripe (via webhook sync) ───────────
        const stripeAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        // ── Transaction totals (capped) ───────────────────────────
        const now = Date.now();
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const lastMonthStart = new Date(thisMonthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const lastMonthEnd = new Date(thisMonthStart);
        lastMonthEnd.setMilliseconds(-1);

        const recentTx = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("status"), "SUCCEEDED"))
            .take(500);

        let totalEarnings = 0;
        let thisMonthEarnings = 0;
        let lastMonthEarnings = 0;

        for (const tx of recentTx) {
            totalEarnings += tx.creativeEarnings;
            if (tx._creationTime >= thisMonthStart.getTime()) {
                thisMonthEarnings += tx.creativeEarnings;
            } else if (
                tx._creationTime >= lastMonthStart.getTime() &&
                tx._creationTime <= lastMonthEnd.getTime()
            ) {
                lastMonthEarnings += tx.creativeEarnings;
            }
        }

        return {
            // ← Real balance from Stripe, not calculated
            availableBalance: stripeAccount?.balance ?? 0,
            // Pending = stripe knows, we estimate from recent tx
            pendingBalance: recentTx
                .filter(
                    tx =>
                        tx.completedAt &&
                        tx.completedAt >= now - 7 * 24 * 60 * 60 * 1000,
                )
                .reduce((sum, tx) => sum + tx.creativeEarnings, 0),
            totalEarnings,
            totalTransactions: recentTx.length,
            thisMonthEarnings,
            lastMonthEarnings,
            currency: stripeAccount?.defaultCurrency ?? "USD",
        };
    },
});

/**
 * Get earnings summary for a creative
 */
export const getEarningsSummary = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const stripeAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const now = Date.now();
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const lastMonthStart = new Date(thisMonthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const lastMonthEnd = new Date(thisMonthStart);
        lastMonthEnd.setMilliseconds(-1);

        const recentTx = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("status"), "SUCCEEDED"))
            .take(500);

        let totalEarnings = 0;
        let thisMonthEarnings = 0;
        let lastMonthEarnings = 0;

        for (const tx of recentTx) {
            totalEarnings += tx.creativeEarnings;
            if (tx._creationTime >= thisMonthStart.getTime()) {
                thisMonthEarnings += tx.creativeEarnings;
            } else if (
                tx._creationTime >= lastMonthStart.getTime() &&
                tx._creationTime <= lastMonthEnd.getTime()
            ) {
                lastMonthEarnings += tx.creativeEarnings;
            }
        }

        const pendingBalance = recentTx
            .filter(
                tx =>
                    tx.completedAt &&
                    tx.completedAt >= now - 7 * 24 * 60 * 60 * 1000,
            )
            .reduce((sum, tx) => sum + tx.creativeEarnings, 0);

        return {
            // ← Real balance from Stripe via webhook sync
            availableBalance: stripeAccount?.balance ?? 0,
            pendingBalance,
            totalEarnings,
            totalTransactions: recentTx.length,
            thisMonthEarnings,
            lastMonthEarnings,
            currency: stripeAccount?.defaultCurrency?.toUpperCase() ?? "USD",
        };
    },
});

/**
 * Get recent transactions for a creative
 */
export const getRecentTransactions = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const limit = args.limit ?? 10;

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .order("desc")
            .take(limit);

        const enrichedTransactions = await Promise.all(
            transactions.map(async tx => {
                const service = await ctx.db.get(tx.serviceId);
                const client = await getProfileByUserId(ctx, tx.clientId);
                const creative = await getProfileByUserId(ctx, tx.creativeId);

                return {
                    ...tx,
                    serviceName: service?.name ?? "Unknown Service",
                    clientName: `${client?.firstName ?? "Unknown"} ${client?.lastName ?? "Client"}`,
                    creativeName: `${creative?.firstName ?? "Unknown"} ${creative?.lastName ?? "Creative"}`,
                };
            }),
        );

        return enrichedTransactions;
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
            items: await Promise.all(
                items.map(async tx => {
                    const service = await ctx.db.get(tx.serviceId);
                    const client = await getProfileByUserId(ctx, tx.clientId);
                    const creative = await getProfileByUserId(
                        ctx,
                        tx.creativeId,
                    );

                    return {
                        ...tx,
                        serviceName: service?.name ?? "Unknown Service",
                        clientName: `${client?.firstName ?? "Unknown"} ${client?.lastName ?? "Client"}`,
                        creativeName: `${creative?.firstName ?? "Unknown"} ${creative?.lastName ?? "Creative"}`,
                    };
                }),
            ),
            hasMore,
            nextCursor: hasMore ? items[items.length - 1]._id : undefined,
        };
    },
});

// ── Creative transactions ─────────────────────────────────────────
export const getCreativeTransactionsPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(TransactionStatusUnion),
    },
    handler: async (ctx, { paginationOpts, status }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const result = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .order("desc")
            .paginate(paginationOpts);

        const filtered = status
            ? result.page.filter(tx => tx.status === status)
            : result.page;

        // ── Batch lookups — collect unique IDs first ──────────────
        const serviceIds = [...new Set(filtered.map(tx => tx.serviceId))];
        const clientIds = [...new Set(filtered.map(tx => tx.clientId))];

        const [services, clientProfiles] = await Promise.all([
            Promise.all(serviceIds.map(id => ctx.db.get(id))),
            Promise.all(
                clientIds.map(id =>
                    ctx.db
                        .query("profiles")
                        .withIndex("by_userId", q => q.eq("userId", id))
                        .first(),
                ),
            ),
        ]);

        // Build lookup maps
        const serviceMap = Object.fromEntries(
            serviceIds.map((id, i) => [id, services[i]]),
        );
        const clientMap = Object.fromEntries(
            clientIds.map((id, i) => [id, clientProfiles[i]]),
        );

        const enriched = filtered.map(tx => {
            const client = clientMap[tx.clientId];
            return {
                ...tx,
                serviceName:
                    serviceMap[tx.serviceId]?.name ?? "Unknown Service",
                clientName: client
                    ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()
                    : "Unknown Client",
                clientAvatar: client?.avatar ?? null,
            };
        });

        return { ...result, page: enriched };
    },
});

// ── Client transactions ───────────────────────────────────────────
export const getClientTransactionsPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(TransactionStatusUnion),
    },
    handler: async (ctx, { paginationOpts, status }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const result = await ctx.db
            .query("transactions")
            .withIndex("by_clientId", q => q.eq("clientId", userId))
            .order("desc")
            .paginate(paginationOpts);

        const filtered = status
            ? result.page.filter(tx => tx.status === status)
            : result.page;

        const enriched = await Promise.all(
            filtered.map(async tx => {
                const service = await ctx.db.get(tx.serviceId);
                const creative = await getProfileByUserId(ctx, tx.creativeId);

                return {
                    ...tx,
                    serviceName: service?.name ?? "Unknown Service",
                    creativeName: creative
                        ? `${creative.firstName ?? ""} ${creative.lastName ?? ""}`.trim()
                        : "Unknown Creative",
                    creativeAvatar: creative?.avatar ?? null,
                };
            }),
        );

        return { ...result, page: enriched };
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

// ── Payouts — paginated ───────────────────────────────────────────
export const getPayouts = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, { paginationOpts }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        return await ctx.db
            .query("payouts")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .order("desc")
            .paginate(paginationOpts);
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
