import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

export async function handlePayoutPaid(ctx: ActionCtx, payout: Stripe.Payout) {
    console.log(`[Stripe] Payout paid: ${payout.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePayoutPaid, {
        stripePayoutId: payout.id,
        amount: payout.amount,
        // currency: payout.currency,
        arrivalDate: payout.arrival_date,
    });
}

export async function handlePayoutFailed(
    ctx: ActionCtx,
    payout: Stripe.Payout,
) {
    console.log(`[Stripe] Payout failed: ${payout.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePayoutFailed, {
        stripePayoutId: payout.id,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
    });
}
