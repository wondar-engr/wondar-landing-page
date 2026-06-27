import { internal } from "@convex/_generated/api";
import { action } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";
import { getStripe } from "../stripe";

export const syncMyBalance = action({
    args: {},
    handler: async (ctx): Promise<void> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const stripeAccount = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getStripeAccount,
            { userId },
        );

        if (!stripeAccount?.stripeAccountId) {
            throw new Error("No Stripe account found");
        }

        const stripe = getStripe();

        // ← Pull BOTH available and pending directly from Stripe
        const balance = await stripe.balance.retrieve(
            {},
            { stripeAccount: stripeAccount.stripeAccountId },
        );

        const availableBalance = balance.available.reduce(
            (sum, b) => sum + b.amount,
            0,
        );
        const pendingBalance = balance.pending.reduce(
            (sum, b) => sum + b.amount,
            0,
        );

        await ctx.runMutation(internal.stripe.webhooks.updateAccountBalance, {
            stripeAccountId: stripeAccount.stripeAccountId,
            balance: availableBalance,
            pendingBalance,
        });
    },
});
