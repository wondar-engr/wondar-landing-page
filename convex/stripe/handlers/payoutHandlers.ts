import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncAccountBalance } from "./accountHandlers";

// ← NEW: called when Stripe auto-creates a payout
export async function handlePayoutCreatedEvent(
    ctx: ActionCtx,
    payout: Stripe.Payout,
    stripeAccountId: string | undefined,
) {
    console.log(`[Stripe] Payout created: ${payout.id}`);

    if (!stripeAccountId) {
        console.warn("[Stripe] payout.created fired without account ID");
        return;
    }

    await ctx.runMutation(internal.stripe.webhooks.handlePayoutCreated, {
        stripePayoutId: payout.id,
        stripeAccountId,
        amount: payout.amount,
        currency: payout.currency,
        arrivalDate: payout.arrival_date,
        status: payout.status,
    });
}

export async function handlePayoutPaid(
    ctx: ActionCtx,
    payout: Stripe.Payout,
    stripeAccountId: string | undefined,
) {
    console.log(`[Stripe] Payout paid: ${payout.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePayoutPaid, {
        stripePayoutId: payout.id,
        amount: payout.amount,
        arrivalDate: payout.arrival_date,
    });

    // Sync real balance after payout
    if (stripeAccountId) {
        await syncAccountBalance(ctx, stripeAccountId);
    }
}

export async function handlePayoutFailed(
    ctx: ActionCtx,
    payout: Stripe.Payout,
    stripeAccountId: string | undefined, // ← add
) {
    console.log(`[Stripe] Payout failed: ${payout.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handlePayoutFailed, {
        stripePayoutId: payout.id,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
    });

    // Also sync balance on failure — balance may have changed
    if (stripeAccountId) {
        await syncAccountBalance(ctx, stripeAccountId);
    }
}

export async function handleTransferCreated(
    ctx: ActionCtx,
    transfer: Stripe.Transfer,
    stripeAccountId: string | undefined,
) {
    console.log(`[Stripe] Transfer created: ${transfer.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handleTransferCreated, {
        stripeTransferId: transfer.id,
        sourceChargeId:
            typeof transfer.source_transaction === "string"
                ? transfer.source_transaction
                : (transfer.source_transaction?.id ?? null),
        destinationAccountId:
            typeof transfer.destination === "string"
                ? transfer.destination
                : (transfer.destination?.id ?? ""),
        amount: transfer.amount,
        currency: transfer.currency,
    });

    // Sync balance after funds arrive on connected account
    if (typeof transfer.destination === "string") {
        await syncAccountBalance(ctx, transfer.destination);
    }
}
