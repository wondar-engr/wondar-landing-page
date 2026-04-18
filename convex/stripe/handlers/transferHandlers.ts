import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";

export async function handleTransferCreated(
    ctx: ActionCtx,
    transfer: Stripe.Transfer,
) {
    console.log(
        `[Stripe] Transfer created: ${transfer.id} - $${transfer.amount / 100}`,
    );

    // Optional: Track transfers in database
    // await ctx.runMutation(internal.stripe.webhooks.handleTransferCreated, {
    //     stripeTransferId: transfer.id,
    //     amount: transfer.amount,
    //     currency: transfer.currency,
    //     destinationAccountId: typeof transfer.destination === 'string'
    //         ? transfer.destination
    //         : transfer.destination?.id ?? '',
    // });
}

export async function handleTransferReversed(
    ctx: ActionCtx,
    transfer: Stripe.Transfer,
) {
    console.log(`[Stripe] Transfer reversed: ${transfer.id}`);
}
