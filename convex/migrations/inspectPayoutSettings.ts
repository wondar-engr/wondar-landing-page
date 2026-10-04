"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getStripe } from "../stripe/index";

export const inspectPayoutSettings = internalAction({
    handler: async ctx => {
        const stripe = getStripe();

        const allAccounts = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getAllStripeAccounts,
        );

        const report: {
            stripeAccountId: string;
            userId: string;
            interval: string | undefined;
            payoutsEnabled: boolean;
        }[] = [];

        for (const acc of allAccounts) {
            try {
                const stripeAcc = await stripe.accounts.retrieve(
                    acc.stripeAccountId,
                );
                report.push({
                    stripeAccountId: acc.stripeAccountId,
                    userId: acc.userId,
                    interval: stripeAcc.settings?.payouts?.schedule?.interval,
                    payoutsEnabled: stripeAcc.payouts_enabled ?? false,
                });
            } catch (err: any) {
                report.push({
                    stripeAccountId: acc.stripeAccountId,
                    userId: acc.userId,
                    interval: `ERROR: ${err.message}`,
                    payoutsEnabled: false,
                });
            }
        }

        console.log("=== PAYOUT SETTINGS REPORT ===");
        console.table(report);
        console.log(`Total accounts: ${report.length}`);
        console.log(
            `Already manual: ${report.filter(r => r.interval === "manual").length}`,
        );
        console.log(
            `Auto (daily/weekly/monthly): ${report.filter(r => r.interval && r.interval !== "manual" && !r.interval.startsWith("ERROR")).length}`,
        );

        return report;
    },
});
