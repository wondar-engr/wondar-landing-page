import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Stripe delivers each event at least once and retries any non-2xx response,
 * so every event is claimed here before its handler runs.
 */

// How long an in-flight claim blocks a retry before we assume the worker died
const STALE_CLAIM_MS = 90 * 1000;

// After this many failed attempts we stop asking Stripe to retry. Returning
// errors forever gets the whole endpoint disabled by Stripe.
export const MAX_WEBHOOK_ATTEMPTS = 5;

export const claim = internalMutation({
    args: { eventId: v.string(), type: v.string() },
    handler: async (ctx, { eventId, type }) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("stripeWebhookEvents")
            .withIndex("by_eventId", q => q.eq("eventId", eventId))
            .unique();

        if (!existing) {
            await ctx.db.insert("stripeWebhookEvents", {
                eventId,
                type,
                status: "processing",
                attempts: 1,
                receivedAt: now,
                startedAt: now,
            });
            return { action: "process" as const, attempts: 1 };
        }

        if (existing.status === "processed") {
            return { action: "skip" as const, attempts: existing.attempts };
        }

        if (
            existing.status === "failed" &&
            existing.attempts >= MAX_WEBHOOK_ATTEMPTS
        ) {
            return { action: "skip" as const, attempts: existing.attempts };
        }

        if (
            existing.status === "processing" &&
            now - existing.startedAt < STALE_CLAIM_MS
        ) {
            return { action: "busy" as const, attempts: existing.attempts };
        }

        const attempts = existing.attempts + 1;
        await ctx.db.patch(existing._id, {
            status: "processing",
            attempts,
            startedAt: now,
        });
        return { action: "process" as const, attempts };
    },
});

export const markProcessed = internalMutation({
    args: { eventId: v.string() },
    handler: async (ctx, { eventId }) => {
        const event = await ctx.db
            .query("stripeWebhookEvents")
            .withIndex("by_eventId", q => q.eq("eventId", eventId))
            .unique();
        if (!event) return;

        await ctx.db.patch(event._id, {
            status: "processed",
            processedAt: Date.now(),
            lastError: undefined,
        });
    },
});

export const markFailed = internalMutation({
    args: { eventId: v.string(), error: v.string() },
    handler: async (ctx, { eventId, error }) => {
        const event = await ctx.db
            .query("stripeWebhookEvents")
            .withIndex("by_eventId", q => q.eq("eventId", eventId))
            .unique();
        if (!event) return;

        await ctx.db.patch(event._id, {
            status: "failed",
            lastError: error.slice(0, 500),
        });
    },
});
