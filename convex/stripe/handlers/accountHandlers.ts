import Stripe from "stripe";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getStripe } from "@convex/lib/stripe";
import { extractBalance } from "@convex/utils/helpers/stripe";

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

export async function handleBalanceAvailable(
    ctx: ActionCtx,
    balance: Stripe.Balance,
    stripeAccountId: string | undefined,
) {
    if (!stripeAccountId) {
        // This is a platform-level balance event, not a connected account
        // Log it for visibility but don't try to update any creative's record
        console.log(
            "[Stripe] balance.available for platform account — skipping",
            `available: ${balance.available.reduce((s, b) => s + b.amount, 0)}`,
            `pending: ${balance.pending.reduce((s, b) => s + b.amount, 0)}`,
        );
        return;
    }

    // Available balance in cents (sum across currencies, usually just one)
    const { availableBalance, pendingBalance } = extractBalance(balance);

    await ctx.runMutation(internal.stripe.webhooks.updateAccountBalance, {
        stripeAccountId,
        balance: availableBalance,
        pendingBalance,
    });

    console.log(
        `[Stripe] Balance updated for ${stripeAccountId}: available=${availableBalance} pending=${pendingBalance}`,
    );
}

// Also call this on payout.paid and transfer.created
// so balance stays fresh even if balance.available fires late
export async function syncAccountBalance(
    ctx: ActionCtx,
    stripeAccountId: string,
) {
    const stripe = getStripe();

    const balance = await stripe.balance.retrieve(
        {},
        { stripeAccount: stripeAccountId },
    );

    const { availableBalance, pendingBalance } = extractBalance(balance);

    await ctx.runMutation(internal.stripe.webhooks.updateAccountBalance, {
        stripeAccountId,
        balance: availableBalance,
        pendingBalance,
    });
}
