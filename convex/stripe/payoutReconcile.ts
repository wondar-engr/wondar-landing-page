import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { getStripe } from "../lib/stripe";

/**
 * Safety net for payout webhooks. A payout that was started in the app but
 * whose "paid" or "failed" event never reached us would otherwise stay PENDING
 * or IN_TRANSIT forever. This asks Stripe for the truth.
 *
 * Runs on a schedule (see crons.ts), and can be run by hand from the
 * dashboard as stripe/payoutReconcile:reconcileOpenPayouts.
 */

// A payout normally settles within minutes (instant) or a few days (standard)
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

type OpenPayout = {
    stripePayoutId: string;
    stripeAccountId: string;
    status: string;
};

type ReconcileSummary = {
    checked: number;
    updated: number;
    failed: number;
};

export const listOpenPayouts = internalQuery({
    args: {},
    handler: async (ctx): Promise<OpenPayout[]> => {
        const cutoff = Date.now() - STALE_AFTER_MS;
        const open = [];

        for (const status of ["PENDING", "IN_TRANSIT"] as const) {
            const payouts = await ctx.db
                .query("payouts")
                .withIndex("by_status", q => q.eq("status", status))
                .collect();
            open.push(...payouts.filter(p => p.updatedAt < cutoff));
        }

        return open.slice(0, BATCH_SIZE).map(p => ({
            stripePayoutId: p.stripePayoutId,
            stripeAccountId: p.stripeAccountId,
            status: p.status,
        }));
    },
});

export const reconcileOpenPayouts = internalAction({
    args: {},
    handler: async (ctx): Promise<ReconcileSummary> => {
        const open: OpenPayout[] = await ctx.runQuery(
            internal.stripe.payoutReconcile.listOpenPayouts,
            {},
        );

        const stripe = getStripe();
        const summary: ReconcileSummary = {
            checked: open.length,
            updated: 0,
            failed: 0,
        };
        const changes: string[] = [];

        for (const record of open) {
            try {
                const payout = await stripe.payouts.retrieve(
                    record.stripePayoutId,
                    {},
                    { stripeAccount: record.stripeAccountId },
                );

                const { changed } = await ctx.runMutation(
                    internal.stripe.webhooks.syncPayout,
                    {
                        stripePayoutId: payout.id,
                        stripeAccountId: record.stripeAccountId,
                        amount: payout.amount,
                        currency: payout.currency,
                        arrivalDate: payout.arrival_date,
                        status: payout.status,
                        method: payout.method,
                        failureCode: payout.failure_code,
                        failureMessage: payout.failure_message,
                    },
                );

                if (changed) {
                    summary.updated++;
                    changes.push(
                        `${payout.id}: ${record.status} → ${payout.status}`,
                    );
                }
            } catch (error) {
                summary.failed++;
                console.error(
                    `[PayoutReconcile] Could not check ${record.stripePayoutId}:`,
                    error,
                );
            }
        }

        // Only worth a message when the webhooks actually missed something
        if (summary.updated > 0) {
            await ctx.scheduler.runAfter(
                0,
                internal.lib.appActions.notifications.sendTelegramNotification,
                {
                    text: [
                        `🔄 Payout reconcile fixed ${summary.updated} payout(s)`,
                        `A webhook was missed for:`,
                        ...changes,
                    ].join("\n"),
                    category: "PAYMENTS",
                },
            );
        }

        return summary;
    },
});
