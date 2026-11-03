import Stripe from "stripe";
import { ActionCtx } from "../_generated/server";
import {
    handleAccountUpdated,
    handleAccountAuthorized,
    handleAccountDeauthorized,
    handlePaymentIntentSucceeded,
    handlePaymentIntentFailed,
    handleChargeRefunded,
    handlePayoutPaid,
    handlePayoutFailed,
    handlePayoutCanceled,
    handlePayoutUpdated,
    handleTransferCreated,
    handleTransferReversed,
    handlePayoutCreatedEvent,
} from "./handlers";
import {
    handleBalanceAvailable,
    handleCapabilityUpdated,
    handlePersonUpdated,
} from "./handlers/accountHandlers";
import { internal } from "@convex/_generated/api";
import { MAX_WEBHOOK_ATTEMPTS } from "./webhookEvents";

interface WebhookResult {
    success: boolean;
    error?: string;
    statusCode: number;
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSecret: string,
): Promise<{ event?: Stripe.Event; error?: string }> {
    try {
        // Use crypto.subtle for async signature verification
        const encoder = new TextEncoder();
        const sigParts = signature.split(",").reduce(
            (acc, part) => {
                const [key, value] = part.split("=");
                if (key === "t") acc.timestamp = value;
                if (key === "v1") acc.signatures.push(value);
                return acc;
            },
            { timestamp: "", signatures: [] as string[] },
        );

        if (!sigParts.timestamp || sigParts.signatures.length === 0) {
            return { error: "Invalid signature format" };
        }

        const signedPayload = `${sigParts.timestamp}.${body}`;

        // Import the key
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );

        // Sign the payload
        const signatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(signedPayload),
        );

        // Convert to hex
        const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        // Check if any signature matches
        const isValid = sigParts.signatures.some(
            sig => sig === expectedSignature,
        );

        if (!isValid) {
            return { error: "Signature verification failed" };
        }

        // Check timestamp (allow 5 minutes tolerance)
        const timestamp = parseInt(sigParts.timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > 300) {
            return { error: "Timestamp outside tolerance" };
        }

        // Parse the event
        const event = JSON.parse(body) as Stripe.Event;
        return { event };
    } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Route webhook events to appropriate handlers
 */
export async function handleWebhookEvent(
    ctx: ActionCtx,
    event: Stripe.Event,
): Promise<WebhookResult> {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);

    // Stripe re-delivers events, so claim this one before doing any work
    const claim = await ctx.runMutation(internal.stripe.webhookEvents.claim, {
        eventId: event.id,
        type: event.type,
    });

    if (claim.action === "skip") {
        console.log(`[Stripe Webhook] Already handled: ${event.id}`);
        return { success: true, statusCode: 200 };
    }

    if (claim.action === "busy") {
        // Another delivery of this event is still running. A non-2xx makes
        // Stripe retry later, by which time the first one has finished.
        return {
            success: false,
            error: "Event is already being processed",
            statusCode: 409,
        };
    }

    // ── Telegram on every webhook — brief, always-on visibility ──
    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        {
            text: [
                `🔔 Stripe Webhook`,
                `Event: ${event.type}`,
                `ID:    ${event.id}`,
                event.account ? `Acct:  ${event.account}` : `Acct:  [platform]`,
                // Full object for debugging — remove once stable
                `Data:  ${JSON.stringify(event.data.object, null, 2).slice(0, 500)}`,
            ].join("\n"),
            category: "WEBHOOKS",
        },
    );

    try {
        switch (event.type) {
            // ==========================================
            // CONNECT ACCOUNT EVENTS
            // ==========================================
            case "account.updated":
                await handleAccountUpdated(
                    ctx,
                    event.data.object as Stripe.Account,
                );
                break;

            case "account.application.authorized":
                await handleAccountAuthorized(
                    ctx,
                    event.data.object as Stripe.Application,
                    event.account,
                );
                break;

            case "account.application.deauthorized":
                await handleAccountDeauthorized(
                    ctx,
                    event.data.object as Stripe.Application,
                    event.account,
                );
                break;

            case "capability.updated":
                await handleCapabilityUpdated(
                    ctx,
                    event.data.object as Stripe.Capability,
                    event.account,
                );
                break;

            case "person.updated":
                await handlePersonUpdated(
                    ctx,
                    event.data.object as Stripe.Person,
                    event.account,
                );
                break;
            // Add to the switch statement
            case "balance.available":
                await handleBalanceAvailable(
                    ctx,
                    event.data.object as Stripe.Balance,
                    event.account, // connected account ID
                );
                break;

            // ==========================================
            // PAYMENT EVENTS
            // ==========================================
            case "payment_intent.succeeded":
                await handlePaymentIntentSucceeded(
                    ctx,
                    event.data.object as Stripe.PaymentIntent,
                    event.account, // connected account ID
                );
                break;

            case "payment_intent.payment_failed":
                await handlePaymentIntentFailed(
                    ctx,
                    event.data.object as Stripe.PaymentIntent,
                );
                break;

            // ==========================================
            // CHARGE EVENTS
            // ==========================================
            case "charge.refunded":
                await handleChargeRefunded(
                    ctx,
                    event.data.object as Stripe.Charge,
                );
                break;

            // ==========================================
            // PAYOUT EVENTS
            // ==========================================

            case "payout.created": // ← NEW: catches automatic Stripe payouts
                await handlePayoutCreatedEvent(
                    ctx,
                    event.data.object as Stripe.Payout,
                    event.account,
                );
                break;

            case "payout.paid":
                await handlePayoutPaid(
                    ctx,
                    event.data.object as Stripe.Payout,
                    event.account,
                );
                break;

            case "payout.failed":
                await handlePayoutFailed(
                    ctx,
                    event.data.object as Stripe.Payout,
                    event.account,
                );
                break;

            case "payout.updated":
                await handlePayoutUpdated(
                    ctx,
                    event.data.object as Stripe.Payout,
                    event.account,
                );
                break;

            case "payout.canceled":
                await handlePayoutCanceled(
                    ctx,
                    event.data.object as Stripe.Payout,
                    event.account,
                );
                break;

            // ==========================================
            // TRANSFER EVENTS
            // ==========================================
            case "transfer.created":
                await handleTransferCreated(
                    ctx,
                    event.data.object as Stripe.Transfer,
                    event.account,
                );
                break;

            case "transfer.reversed":
                await handleTransferReversed(
                    ctx,
                    event.data.object as Stripe.Transfer,
                    event.account,
                );
                break;

            // ==========================================
            // UNHANDLED EVENTS
            // ==========================================
            default:
                console.log(
                    `[Stripe Webhook] Unhandled event type: ${event.type}`,
                );
        }

        await ctx.runMutation(internal.stripe.webhookEvents.markProcessed, {
            eventId: event.id,
        });
        return { success: true, statusCode: 200 };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);

        await ctx.runMutation(internal.stripe.webhookEvents.markFailed, {
            eventId: event.id,
            error: message,
        });

        // Give up after a few attempts: Stripe disables endpoints that keep
        // returning errors, and the event stays in stripeWebhookEvents
        const gaveUp = claim.attempts >= MAX_WEBHOOK_ATTEMPTS;

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    gaveUp
                        ? `🛑 Stripe Webhook GAVE UP`
                        : `🚨 Stripe Webhook ERROR`,
                    `Event: ${event.type}`,
                    `ID: ${event.id}`,
                    `Attempt: ${claim.attempts}/${MAX_WEBHOOK_ATTEMPTS}`,
                    `Error: ${message}`,
                    gaveUp
                        ? `No more retries. Check stripeWebhookEvents.`
                        : `Stripe will retry.`,
                ].join("\n"),
            },
        );

        return {
            success: false,
            error: message,
            statusCode: gaveUp ? 200 : 500,
        };
    }
}
