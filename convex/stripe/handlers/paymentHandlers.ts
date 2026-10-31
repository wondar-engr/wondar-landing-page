import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncAccountBalance } from "./accountHandlers";
import { getChargeProcessingFee } from "../../lib/stripe/fees";

export async function handlePaymentIntentSucceeded(
    ctx: ActionCtx,
    paymentIntent: Stripe.PaymentIntent,
    stripeAccountId?: string, // ← now passed from webhookHandler
) {
    console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);

    // ✅ Fix Gap 1: extract latest_charge — it's a string ID not an object
    const stripeChargeId =
        typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : (paymentIntent.latest_charge?.id ?? undefined);

    const result = await ctx.runMutation(
        internal.stripe.webhooks.handlePaymentSucceeded,
        {
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
        },
    );

    // Record what Stripe charged Wondar for this payment. The ledger can be
    // backfilled, so a failure here must not fail the webhook.
    if (result.ok && result.transactionId && stripeChargeId) {
        try {
            const stripeFee = await getChargeProcessingFee(stripeChargeId);
            // 0 means Stripe has not reported a fee, so leave it for the backfill
            if (stripeFee) {
                await ctx.runMutation(internal.stripe.ledger.recordStripeFee, {
                    transactionId: result.transactionId,
                    stripeFee,
                });
            }
        } catch (error) {
            console.error(
                `[Stripe] Could not record fee for ${stripeChargeId}:`,
                error,
            );
        }
    }

    // ← Sync balance after payment so earnings screen updates
    // transfer_data.destination is the connected account
    const destination = paymentIntent.transfer_data?.destination;
    const accountToSync =
        stripeAccountId ??
        (typeof destination === "string" ? destination : destination?.id);

    if (accountToSync) {
        await syncAccountBalance(ctx, accountToSync);
    }
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
