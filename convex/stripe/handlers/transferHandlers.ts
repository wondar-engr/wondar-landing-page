import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

export async function handleTransferCreated(
    ctx: ActionCtx,
    transfer: Stripe.Transfer,
) {
    console.log(
        `[Stripe] Transfer created: ${transfer.id} - $${transfer.amount / 100}`,
    );

    // source_transaction is the charge ID, not the payment intent ID
    // It can be a string ID or an expanded Charge object
    const sourceChargeId =
        typeof transfer.source_transaction === "string"
            ? transfer.source_transaction
            : (transfer.source_transaction?.id ?? null);

    const destinationAccountId =
        typeof transfer.destination === "string"
            ? transfer.destination
            : (transfer.destination?.id ?? "");

    await ctx.runMutation(internal.stripe.webhooks.handleTransferCreated, {
        stripeTransferId: transfer.id,
        sourceChargeId,
        destinationAccountId,
        amount: transfer.amount,
        currency: transfer.currency,
    });
}

export async function handleTransferReversed(
    ctx: ActionCtx,
    transfer: Stripe.Transfer,
) {
    console.log(
        `[Stripe] Transfer reversed: ${transfer.id} - $${transfer.amount_reversed / 100} reversed`,
    );

    await ctx.runMutation(internal.stripe.webhooks.handleTransferReversed, {
        stripeTransferId: transfer.id,
        amountReversed: transfer.amount_reversed,
    });
}
