"use node";

import { action } from "../../_generated/server";
import { getStripe } from "./index";
import { internal } from "../../_generated/api";

type BackfillResult = {
    stripeAccountId: string;
    userId: string;
    available?: number;
    pending?: number;
    status: "ok" | "failed";
    error?: string;
};

type BackfillSummary = {
    synced: number;
    failed: number;
    results: BackfillResult[];
};

/**
 * One-time backfill — syncs real Stripe balance for ALL connected accounts.
 * Run manually from Convex dashboard.
 */
export const backfillAllAccountBalances = action({
    args: {},
    handler: async (ctx): Promise<BackfillSummary> => {
        const stripe = getStripe();

        // Get all connected accounts from our DB
        const accounts = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getAllStripeAccountIds,
        );

        if (!accounts || accounts.length === 0) {
            console.log("[Backfill] No accounts found");
            return { synced: 0, failed: 0, results: [] };
        }

        console.log(`[Backfill] Syncing ${accounts.length} accounts...`);

        const results: BackfillResult[] = [];
        let synced = 0;
        let failed = 0;

        for (const account of accounts) {
            try {
                // Fetch real balance from Stripe
                const balance = await stripe.balance.retrieve(
                    {},
                    { stripeAccount: account.stripeAccountId },
                );

                const available = balance.available.reduce(
                    (sum, b) => sum + b.amount,
                    0,
                );
                const pending = balance.pending.reduce(
                    (sum, b) => sum + b.amount,
                    0,
                );

                // Update DB
                await ctx.runMutation(
                    internal.lib.stripe.connectMutations.updateAccountBalance,
                    {
                        stripeAccountId: account.stripeAccountId,
                        balance: available,
                    },
                );

                console.log(
                    `[Backfill] ✅ ${account.stripeAccountId}: available=${available} pending=${pending}`,
                );

                results.push({
                    stripeAccountId: account.stripeAccountId,
                    userId: account.userId,
                    available,
                    pending,
                    status: "ok",
                });

                synced++;
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                console.error(
                    `[Backfill] ❌ ${account.stripeAccountId}: ${message}`,
                );

                results.push({
                    stripeAccountId: account.stripeAccountId,
                    userId: account.userId,
                    status: "failed",
                    error: message,
                });

                failed++;
            }
        }

        console.log(`[Backfill] Done. Synced: ${synced}, Failed: ${failed}`);

        return { synced, failed, results };
    },
});
