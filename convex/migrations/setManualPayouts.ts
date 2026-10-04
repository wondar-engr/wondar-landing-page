"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getStripe } from "../stripe/index";

export const migrateExistingAccountsToManual = internalAction({
    handler: async ctx => {
        const stripe = getStripe();

        const allAccounts = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getAllStripeAccounts,
        );

        const results = { updated: 0, failed: 0, errors: [] as string[] };

        for (const acc of allAccounts) {
            try {
                await stripe.accounts.update(acc.stripeAccountId, {
                    settings: {
                        payouts: {
                            schedule: {
                                interval: "manual",
                            },
                        },
                    },
                });
                results.updated++;
                console.log(`✅ Updated ${acc.stripeAccountId}`);
            } catch (err: any) {
                results.failed++;
                results.errors.push(`${acc.stripeAccountId}: ${err.message}`);
                console.error(`❌ Failed ${acc.stripeAccountId}:`, err.message);
            }
        }

        console.log("Migration complete:", results);
        return results;
    },
});
