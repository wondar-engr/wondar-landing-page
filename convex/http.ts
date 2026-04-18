import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import {
    handleWebhookEvent,
    verifyWebhookSignature,
} from "./stripe/webhookHandler";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(
            JSON.stringify({ status: "ok", timestamp: Date.now() }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    }),
});

// ==========================================
// STRIPE WEBHOOK ENDPOINT
// ==========================================

http.route({
    path: "/stripe-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET is not set");
            return new Response("Webhook secret not configured", {
                status: 500,
            });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
            console.error("No stripe-signature header");
            return new Response("No signature", { status: 400 });
        }

        const body = await request.text();

        // Verify signature
        const { event, error } = await verifyWebhookSignature(
            body,
            signature,
            webhookSecret,
        );

        if (error || !event) {
            console.error("Webhook signature verification failed:", error);
            return new Response(`Webhook Error: ${error}`, { status: 400 });
        }

        // Handle the event
        const result = await handleWebhookEvent(ctx, event);

        return new Response(result.success ? "OK" : result.error, {
            status: result.statusCode,
        });
    }),
});

export default http;
