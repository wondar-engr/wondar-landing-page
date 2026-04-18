import Stripe from "stripe";
import { ActionCtx } from "../_generated/server";
import { getStripe } from "./index";
import {
    handleAccountUpdated,
    handleAccountAuthorized,
    handleAccountDeauthorized,
    handlePaymentIntentSucceeded,
    handlePaymentIntentFailed,
    handleChargeRefunded,
    handlePayoutPaid,
    handlePayoutFailed,
    handleTransferCreated,
    handleTransferReversed,
} from "./handlers";

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
    const stripe = getStripe();

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
    } catch (err: any) {
        return { error: err.message };
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

            // ==========================================
            // PAYMENT EVENTS
            // ==========================================
            case "payment_intent.succeeded":
                await handlePaymentIntentSucceeded(
                    ctx,
                    event.data.object as Stripe.PaymentIntent,
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
            case "payout.paid":
                await handlePayoutPaid(ctx, event.data.object as Stripe.Payout);
                break;

            case "payout.failed":
                await handlePayoutFailed(
                    ctx,
                    event.data.object as Stripe.Payout,
                );
                break;

            // ==========================================
            // TRANSFER EVENTS
            // ==========================================
            case "transfer.created":
                await handleTransferCreated(
                    ctx,
                    event.data.object as Stripe.Transfer,
                );
                break;

            case "transfer.reversed":
                await handleTransferReversed(
                    ctx,
                    event.data.object as Stripe.Transfer,
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

        return { success: true, statusCode: 200 };
    } catch (error: any) {
        console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
        // Return 200 to prevent Stripe from retrying
        // We log the error and can investigate later
        return { success: false, error: error.message, statusCode: 200 };
    }
}
