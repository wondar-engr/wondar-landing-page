import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

export async function handlePaymentIntentSucceeded(
    ctx: ActionCtx,
    paymentIntent: Stripe.PaymentIntent,
) {
    console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePaymentSucceeded, {
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
    });
}

export async function handlePaymentIntentFailed(
    ctx: ActionCtx,
    paymentIntent: Stripe.PaymentIntent,
) {
    console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePaymentFailed, {
        stripePaymentIntentId: paymentIntent.id,
        errorMessage:
            paymentIntent.last_payment_error?.message ?? "Payment failed",
    });
}

export async function handleChargeRefunded(
    ctx: ActionCtx,
    charge: Stripe.Charge,
) {
    console.log(`[Stripe] Charge refunded: ${charge.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handleChargeRefunded, {
        stripeChargeId: charge.id,
        amountRefunded: charge.amount_refunded,
        paymentIntentId:
            typeof charge.payment_intent === "string"
                ? charge.payment_intent
                : (charge.payment_intent?.id ?? null),
    });
}
