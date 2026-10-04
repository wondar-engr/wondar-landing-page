import { mutation } from "../../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { getAuthUserId } from "../../../../auth";
import { sendNotification } from "../../../notifications";
import { createServiceAndBookingFromQuote } from "./helpers";
import { QUOTE_RESPONSE_WINDOW_MS } from "./constants";

export const saveDraft = mutation({
    args: {
        quoteId: v.optional(v.id("quotes")),
        creativeId: v.string(),
        title: v.string(),
        budget: v.number(),
        proposedDate: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        details: v.string(),
        mediaUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const { quoteId, ...fields } = args;

        if (quoteId) {
            const existing = await ctx.db.get(quoteId);
            if (!existing || existing.clientId !== clientId) {
                throw new Error("Quote not found");
            }
            if (existing.status !== "DRAFT") {
                throw new Error("Only drafts can be edited this way");
            }
            await ctx.db.patch(quoteId, { ...fields, updatedAt: Date.now() });
            return { quoteId };
        }

        const id = await ctx.db.insert("quotes", {
            clientId,
            ...fields,
            status: "DRAFT",
            updatedAt: Date.now(),
        });
        return { quoteId: id };
    },
});

export const deleteDraft = mutation({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.clientId !== clientId || quote.status !== "DRAFT") {
            throw new Error("Draft not found");
        }

        await ctx.db.delete(args.quoteId);
        return { success: true };
    },
});

export const sendQuote = mutation({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.clientId !== clientId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "DRAFT") {
            throw new Error("Quote has already been sent");
        }

        await ctx.db.patch(args.quoteId, {
            status: "PENDING",
            awaitingRole: "CREATIVE",
            respondBy: Date.now() + QUOTE_RESPONSE_WINDOW_MS,
            reminderSent: false,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.creativeId,
            title: "New Quote Request",
            body: `${quote.title} — $${(quote.budget / 100).toFixed(2)}`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: args.quoteId },
            metaUser: clientId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `📨 QUOTE SENT`,
                    ``,
                    `🆔 Quote ID:  ${args.quoteId}`,
                    `👤 Client:    ${clientId}`,
                    `🎨 Creative:  ${quote.creativeId}`,
                    `📌 Title:     ${quote.title}`,
                    `💰 Budget:    $${(quote.budget / 100).toFixed(2)}`,
                    `📅 Date:      ${quote.proposedDate}`,
                    `⏰ Deadline:  48 hours to respond`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});

export const acceptCounter = mutation({
    args: {
        quoteId: v.id("quotes"),
        clientTimezone: v.string(),
    },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.clientId !== clientId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "CREATIVE_COUNTERED") {
            throw new Error("No counter offer to accept");
        }

        const { serviceId, bookingId, orderNo } =
            await createServiceAndBookingFromQuote(
                ctx,
                quote,
                args.clientTimezone,
            );

        await ctx.db.patch(args.quoteId, {
            status: "ACCEPTED",
            awaitingRole: undefined,
            serviceId,
            bookingId,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.creativeId,
            title: "Counter Offer Accepted! 🎉",
            body: `${quote.title} — client accepted your terms. Booking created.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: clientId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✅ CLIENT ACCEPTED COUNTER → BOOKING CREATED`,
                    ``,
                    `🆔 Quote ID:   ${args.quoteId}`,
                    `📋 Order No:   ${orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `👤 Client:     ${clientId}`,
                    `🎨 Creative:   ${quote.creativeId}`,
                    `📌 Title:      ${quote.title}`,
                    `💰 Budget:     $${(quote.budget / 100).toFixed(2)}`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, bookingId, serviceId };
    },
});

export const declineCounter = mutation({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.clientId !== clientId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "CREATIVE_COUNTERED") {
            throw new Error("No counter offer to decline");
        }

        await ctx.db.patch(args.quoteId, {
            status: "DECLINED_BY_CLIENT",
            awaitingRole: undefined,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.creativeId,
            title: "Counter Offer Declined",
            body: `Client declined your counter for "${quote.title}". Deal is off.`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: args.quoteId },
            metaUser: clientId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ CLIENT DECLINED COUNTER`,
                    ``,
                    `🆔 Quote ID: ${args.quoteId}`,
                    `👤 Client:   ${clientId}`,
                    `🎨 Creative: ${quote.creativeId}`,
                    `📌 Title:    ${quote.title}`,
                    `ℹ️ Deal is off.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});

export const sendFinalOffer = mutation({
    args: {
        quoteId: v.id("quotes"),
        budget: v.number(),
        proposedDate: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.clientId !== clientId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "CREATIVE_COUNTERED") {
            throw new Error("A final offer can only follow a counter offer");
        }

        const { quoteId, message, ...terms } = args;

        await ctx.db.insert("quoteOffers", {
            quoteId,
            fromRole: "CLIENT",
            ...terms,
            message,
            isFinal: true,
            createdAt: Date.now(),
        });

        await ctx.db.patch(quoteId, {
            ...terms,
            status: "CLIENT_FINAL",
            awaitingRole: "CREATIVE",
            respondBy: Date.now() + QUOTE_RESPONSE_WINDOW_MS,
            reminderSent: false,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.creativeId,
            title: "Final Offer Received",
            body: `${quote.title} — client sent their final offer. This is their last one.`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: quoteId },
            metaUser: clientId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🔒 CLIENT SENT FINAL OFFER`,
                    ``,
                    `🆔 Quote ID:   ${quoteId}`,
                    `👤 Client:     ${clientId}`,
                    `🎨 Creative:   ${quote.creativeId}`,
                    `📌 Title:      ${quote.title}`,
                    `💰 Final Budget: $${(args.budget / 100).toFixed(2)}`,
                    `⏰ Deadline:   48 hours — creative can only accept or decline.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});
