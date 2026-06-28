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

    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    const detailsSubmitted = account.details_submitted ?? false;
    const currentlyDue = account.requirements?.currently_due ?? [];
    const eventuallyDue = account.requirements?.eventually_due ?? [];
    const pastDue = account.requirements?.past_due ?? [];
    const disabledReason = account.requirements?.disabled_reason ?? null;

    await ctx.runMutation(internal.stripe.webhooks.handleAccountUpdated, {
        stripeAccountId: account.id,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        requirements: {
            currentlyDue,
            eventuallyDue,
            pastDue,
            disabledReason,
        },
    });

    // ── Resolve creative name from metadata ───────────────────────
    const wondarUserId = account.metadata?.wondarUserId ?? null;
    const creativeName = wondarUserId
        ? await getCreativeName(ctx, wondarUserId)
        : `Unknown (${account.id.slice(-6)})`;

    // ── Determine new status for Telegram ────────────────────────
    let resolvedStatus = "PENDING";
    if (disabledReason) {
        resolvedStatus = "DISABLED";
    } else if (chargesEnabled && payoutsEnabled) {
        resolvedStatus = "ACTIVE";
    } else if (
        detailsSubmitted ||
        currentlyDue.length > 0 ||
        eventuallyDue.length > 0 ||
        pastDue.length > 0
    ) {
        resolvedStatus = "RESTRICTED";
    }

    const statusEmoji: Record<string, string> = {
        ACTIVE: "✅",
        RESTRICTED: "⚠️",
        DISABLED: "🔴",
        PENDING: "🕐",
    };

    const requirementLines = [
        ...pastDue.map(r => `   🔴 PAST DUE:  ${r}`),
        ...currentlyDue.map(r => `   🟡 DUE NOW:  ${r}`),
        ...eventuallyDue.map(r => `   ⚪ EVENTUAL: ${r}`),
    ];

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `${statusEmoji[resolvedStatus] ?? "🔔"} ACCOUNT UPDATED — ${resolvedStatus}`,
                ``,
                `🎨 Creative:    ${creativeName}`,
                `🆔 Stripe ID:   ${account.id}`,
                ``,
                `💳 Charges:     ${chargesEnabled ? "Enabled ✅" : "Disabled ❌"}`,
                `💸 Payouts:     ${payoutsEnabled ? "Enabled ✅" : "Disabled ❌"}`,
                `📋 Submitted:   ${detailsSubmitted ? "Yes ✅" : "No ❌"}`,
                requirementLines.length > 0
                    ? `\n📌 Requirements:\n${requirementLines.join("\n")}`
                    : null,
                disabledReason
                    ? `\n🚫 Disabled reason: ${disabledReason}`
                    : null,
            ]
                .filter(Boolean)
                .join("\n"),
            category: "ACCOUNTS",
        },
    );
}

export async function handleAccountAuthorized(
    ctx: ActionCtx,
    application: Stripe.Application,
    connectedAccountId?: string,
) {
    console.log(`[Stripe] Application authorized: ${application.id}`);
    console.log(`[Stripe] Connected account: ${connectedAccountId}`);

    const creativeName = connectedAccountId
        ? await getCreativeNameByStripeId(ctx, connectedAccountId)
        : "Unknown";

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `🔗 STRIPE ACCOUNT CONNECTED`,
                ``,
                `🎨 Creative:    ${creativeName}`,
                `🆔 Stripe ID:   ${connectedAccountId ?? "unknown"}`,
                `📱 App ID:      ${application.id}`,
                ``,
                `ℹ️ Creative has authorized Wondar to access their Stripe account.`,
            ].join("\n"),
            category: "ACCOUNTS",
        },
    );
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
            { stripeAccountId: connectedAccountId },
        );
    }

    const creativeName = connectedAccountId
        ? await getCreativeNameByStripeId(ctx, connectedAccountId)
        : "Unknown";

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `🔌 STRIPE ACCOUNT DISCONNECTED`,
                ``,
                `🎨 Creative:    ${creativeName}`,
                `🆔 Stripe ID:   ${connectedAccountId ?? "unknown"}`,
                ``,
                `⚠️ Creative has disconnected their Stripe account.`,
                `   They will no longer be able to receive payments.`,
                `🔧 Follow up if this was unintentional.`,
            ].join("\n"),
            category: "ACCOUNTS",
        },
    );
}

export async function handleCapabilityUpdated(
    ctx: ActionCtx,
    capability: Stripe.Capability,
    connectedAccountId: string | undefined,
) {
    console.log(`[Stripe] Capability updated: ${capability.id}`);

    const creativeName = connectedAccountId
        ? await getCreativeNameByStripeId(ctx, connectedAccountId)
        : "Unknown";

    const statusEmoji: Record<string, string> = {
        active: "✅",
        inactive: "❌",
        pending: "🕐",
    };

    const isProblematic =
        capability.status === "inactive" || capability.status === "pending";

    const requirementLines = [
        ...(capability.requirements?.past_due ?? []).map(
            r => `   🔴 PAST DUE:  ${r}`,
        ),
        ...(capability.requirements?.currently_due ?? []).map(
            r => `   🟡 DUE NOW:  ${r}`,
        ),
    ];

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `${isProblematic ? "⚠️" : "✅"} CAPABILITY UPDATED — ${capability.id}`,
                ``,
                `🎨 Creative:    ${creativeName}`,
                `🆔 Stripe ID:   ${connectedAccountId ?? "unknown"}`,
                `⚡ Capability:  ${capability.id}`,
                `📊 Status:      ${statusEmoji[capability.status] ?? "❓"} ${capability.status.toUpperCase()}`,
                requirementLines.length > 0
                    ? `\n📌 Requirements:\n${requirementLines.join("\n")}`
                    : null,
                isProblematic
                    ? `\n🔧 Creative may not be able to accept payments until resolved.`
                    : null,
            ]
                .filter(Boolean)
                .join("\n"),
            category: "ACCOUNTS",
        },
    );
}

export async function handlePersonUpdated(
    ctx: ActionCtx,
    person: Stripe.Person,
    connectedAccountId: string | undefined,
) {
    console.log(`[Stripe] Person updated: ${person.id}`);

    const creativeName = connectedAccountId
        ? await getCreativeNameByStripeId(ctx, connectedAccountId)
        : "Unknown";

    const verificationStatus = person.verification?.status ?? "unknown";
    const isProblematic =
        verificationStatus === "unverified" ||
        verificationStatus === "requires_input";

    const requirementLines = [
        ...(person.requirements?.past_due ?? []).map(
            r => `   🔴 PAST DUE:  ${r}`,
        ),
        ...(person.requirements?.currently_due ?? []).map(
            r => `   🟡 DUE NOW:  ${r}`,
        ),
    ];

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `${isProblematic ? "⚠️" : "✅"} PERSON VERIFICATION UPDATE`,
                ``,
                `🎨 Creative:     ${creativeName}`,
                `🆔 Stripe ID:    ${connectedAccountId ?? "unknown"}`,
                `👤 Person:       ${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
                `🔍 Verification: ${verificationStatus.toUpperCase()}`,
                requirementLines.length > 0
                    ? `\n📌 Requirements:\n${requirementLines.join("\n")}`
                    : null,
                isProblematic
                    ? `\n🔧 Creative needs to submit identity documents.`
                    : null,
            ]
                .filter(Boolean)
                .join("\n"),
            category: "ACCOUNTS",
        },
    );
}

export async function handleBalanceAvailable(
    ctx: ActionCtx,
    balance: Stripe.Balance,
    stripeAccountId: string | undefined,
) {
    if (!stripeAccountId) {
        console.log(
            "[Stripe] balance.available for platform account — skipping",
        );
        return;
    }

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

// ── Helpers ───────────────────────────────────────────────────────

async function getCreativeName(
    ctx: ActionCtx,
    userId: string,
): Promise<string> {
    try {
        const profile = await ctx.runQuery(
            internal.lib.internalQueries.profiles.getProfileByUserId,
            { userId },
        );
        if (!profile) return `User (${userId.slice(-6)})`;
        return (
            `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
            `User (${userId.slice(-6)})`
        );
    } catch {
        return `User (${userId.slice(-6)})`;
    }
}

async function getCreativeNameByStripeId(
    ctx: ActionCtx,
    stripeAccountId: string,
): Promise<string> {
    try {
        const account = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByStripeId,
            { stripeAccountId },
        );
        if (!account?.userId) return `Stripe (${stripeAccountId.slice(-6)})`;
        return getCreativeName(ctx, account.userId);
    } catch {
        return `Stripe (${stripeAccountId.slice(-6)})`;
    }
}
