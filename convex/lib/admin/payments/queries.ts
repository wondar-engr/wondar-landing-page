import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { TransactionStatusUnion, PayoutStatusUnion } from "@convex/unions";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

export const getAllTransactions = query({
    args: {
        status: v.optional(TransactionStatusUnion),
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const limit = args.limit ?? 50;
        let transactions;

        if (args.status) {
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_status", q => q.eq("status", args.status!))
                .order("desc")
                .take(limit);
        } else {
            transactions = await ctx.db
                .query("transactions")
                .order("desc")
                .take(limit);
        }

        if (args.search) {
            const q = args.search.toLowerCase();
            transactions = transactions.filter(
                t =>
                    t.stripePaymentIntentId.toLowerCase().includes(q) ||
                    t.metadata?.clientName?.toLowerCase().includes(q) ||
                    t.metadata?.serviceName?.toLowerCase().includes(q),
            );
        }

        return Promise.all(
            transactions.map(async t => {
                const booking = await ctx.db.get(t.bookingId);
                return { ...t, orderNo: booking?.orderNo ?? null };
            }),
        );
    },
});

export const getTransactionById = query({
    args: { transactionId: v.id("transactions") },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const transaction = await ctx.db.get(args.transactionId);
        if (!transaction) return null;

        const [booking, clientProfile, creativeProfile] = await Promise.all([
            ctx.db.get(transaction.bookingId),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q =>
                    q.eq("userId", transaction.clientId),
                )
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q =>
                    q.eq("userId", transaction.creativeId),
                )
                .first(),
        ]);

        const service = booking ? await ctx.db.get(booking.serviceId) : null;

        // Refund is linked via transactionId
        const refund = await ctx.db
            .query("refunds")
            .withIndex("by_transactionId", q =>
                q.eq("transactionId", args.transactionId),
            )
            .first();

        return {
            ...transaction,
            booking: booking ?? null,
            service: service ?? null,
            clientProfile: clientProfile ?? null,
            creativeProfile: creativeProfile ?? null,
            refund: refund ?? null,
        };
    },
});

export const getAllPayouts = query({
    args: {
        status: v.optional(PayoutStatusUnion),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const limit = args.limit ?? 50;
        let payouts;

        if (args.status) {
            payouts = await ctx.db
                .query("payouts")
                .withIndex("by_status", q => q.eq("status", args.status!))
                .order("desc")
                .take(limit);
        } else {
            payouts = await ctx.db.query("payouts").order("desc").take(limit);
        }

        // Enrich with creative profile only — no booking link
        return Promise.all(
            payouts.map(async p => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", p.creativeId))
                    .first();

                return {
                    ...p,
                    creativeName: profile
                        ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
                        : "Unknown",
                };
            }),
        );
    },
});

export const getPaymentStats = query({
    args: {},
    handler: async ctx => {
        await requireAdminProfile(ctx);

        const [transactions, payouts, refunds] = await Promise.all([
            ctx.db.query("transactions").collect(),
            ctx.db.query("payouts").collect(),
            ctx.db.query("refunds").collect(),
        ]);

        const succeeded = transactions.filter(t => t.status === "SUCCEEDED");

        return {
            totalVolume: succeeded.reduce((sum, t) => sum + t.totalCharged, 0),
            platformEarnings: succeeded.reduce(
                (sum, t) => sum + t.platformEarnings,
                0,
            ),
            pendingPayouts: payouts
                .filter(
                    p => p.status === "PENDING" || p.status === "IN_TRANSIT",
                )
                .reduce((sum, p) => sum + p.amount, 0),
            totalRefunded: refunds
                .filter(r => r.status === "SUCCEEDED")
                .reduce((sum, r) => sum + r.amount, 0),
            failedCount: transactions.filter(t => t.status === "FAILED").length,
            refundCount: refunds.filter(r => r.status === "SUCCEEDED").length,
            pendingPayoutCount: payouts.filter(p => p.status === "PENDING")
                .length,
        };
    },
});
