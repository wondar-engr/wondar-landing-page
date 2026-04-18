import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

export async function handleAccountUpdated(
    ctx: ActionCtx,
    account: Stripe.Account,
) {
    console.log(`[Stripe] Account updated: ${account.id}`);

    await ctx.runMutation(internal.stripe.webhooks.handleAccountUpdated, {
        stripeAccountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted ?? false,
        requirements: {
            currentlyDue: account.requirements?.currently_due ?? [],
            eventuallyDue: account.requirements?.eventually_due ?? [],
            pastDue: account.requirements?.past_due ?? [],
            disabledReason: account.requirements?.disabled_reason ?? null,
        },
    });
}
export async function handleAccountAuthorized(
    ctx: ActionCtx,
    application: Stripe.Application,
    connectedAccountId?: string,
) {
    console.log(`[Stripe] Application authorized: ${application.id}`);
    console.log(`[Stripe] Connected account: ${connectedAccountId}`);

    // The connected account ID comes from event.account, not the object
    // You could send a notification or update status here
}

export async function handleAccountDeauthorized(
    ctx: ActionCtx,
    application: Stripe.Application,
    connectedAccountId?: string,
) {
    console.log(`[Stripe] Application deauthorized: ${application.id}`);
    console.log(`[Stripe] Connected account: ${connectedAccountId}`);

    if (connectedAccountId) {
        await ctx.runMutation(
            internal.stripe.webhooks.handleAccountDeauthorized,
            {
                stripeAccountId: connectedAccountId,
            },
        );
    }
}
