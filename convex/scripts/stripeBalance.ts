import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { getStripe } from "../lib/stripe";

/**
 * Read-only look at the platform's Stripe balance: what it is now, and every
 * recent entry that moved it, so a negative balance can be traced.
 *
 * Run from the Convex dashboard (production) as
 * scripts/stripeBalance:inspect with { "limit": 100 } (max 100 per page).
 * Nothing is changed.
 */
export const inspect = internalAction({
    args: { limit: v.optional(v.number()) },
    handler: async (_ctx, { limit }) => {
        const stripe = getStripe();

        const balance = await stripe.balance.retrieve();
        const txns = await stripe.balanceTransactions.list({
            limit: Math.min(limit ?? 100, 100),
        });

        // Totals by type, e.g. charge, transfer, payout, refund, stripe_fee
        const byType: Record<string, { count: number; net: number }> = {};
        for (const t of txns.data) {
            byType[t.type] ??= { count: 0, net: 0 };
            byType[t.type].count++;
            byType[t.type].net += t.net;
        }

        return {
            available: balance.available.map(b => ({
                currency: b.currency,
                amount: b.amount,
            })),
            pending: balance.pending.map(b => ({
                currency: b.currency,
                amount: b.amount,
            })),
            byType,
            // Newest first. net is in cents; negative means money left.
            entries: txns.data.map(t => ({
                when: new Date(t.created * 1000).toISOString(),
                type: t.type,
                net: t.net,
                fee: t.fee,
                status: t.status,
                description: t.description,
                source: typeof t.source === "string" ? t.source : t.source?.id,
            })),
        };
    },
});
