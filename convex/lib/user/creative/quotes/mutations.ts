import { mutation } from "../../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { getAuthUserId } from "../../../../auth";
import { sendNotification } from "../../../notifications";
import { createServiceAndBookingFromQuote } from "../../core/quotes/helpers";
import { QUOTE_RESPONSE_WINDOW_MS } from "../../core/quotes/constants";

export const declineQuote = mutation({
    args: {
        quoteId: v.id("quotes"),
        reason: v.string(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "PENDING") {
            throw new Error("This quote can no longer be declined");
        }

        await ctx.db.patch(args.quoteId, {
            status: "DECLINED_BY_CREATIVE",
            declineReason: args.reason,
            declineNote: args.note,
            awaitingRole: undefined,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.clientId,
            title: "Quote Declined",
            body: `Sorry, the creative declined — ${args.reason}`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: args.quoteId },
            metaUser: creativeId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ QUOTE DECLINED`,
                    ``,
                    `🆔 Quote ID:  ${args.quoteId}`,
                    `👤 Client:    ${quote.clientId}`,
                    `🎨 Creative:  ${creativeId}`,
                    `📌 Title:     ${quote.title}`,
                    `📝 Reason:    ${args.reason}`,
                    args.note ? `💬 Note: ${args.note}` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});

export const counterQuote = mutation({
    args: {
        quoteId: v.id("quotes"),
        budget: v.number(),
        proposedDate: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "PENDING") {
            throw new Error("This quote can no longer be countered");
        }

        const { quoteId, message, ...terms } = args;

        await ctx.db.insert("quoteOffers", {
            quoteId,
            fromRole: "CREATIVE",
            ...terms,
            message,
            createdAt: Date.now(),
        });

        await ctx.db.patch(quoteId, {
            ...terms,
            status: "CREATIVE_COUNTERED",
            awaitingRole: "CLIENT",
            respondBy: Date.now() + QUOTE_RESPONSE_WINDOW_MS,
            reminderSent: false,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.clientId,
            title: "Counter Offer Received",
            body: `New terms proposed for "${quote.title}"`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: quoteId },
            metaUser: creativeId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🔄 CREATIVE COUNTERED`,
                    ``,
                    `🆔 Quote ID:   ${quoteId}`,
                    `👤 Client:     ${quote.clientId}`,
                    `🎨 Creative:   ${creativeId}`,
                    `📌 Title:      ${quote.title}`,
                    `💰 New Budget: $${(args.budget / 100).toFixed(2)}`,
                    `📅 New Date:   ${args.proposedDate}`,
                    `⏰ Deadline:   48 hours for client to respond`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});

export const acceptQuote = mutation({
    args: {
        quoteId: v.id("quotes"),
        clientTimezone: v.string(),
    },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "PENDING") {
            throw new Error("This quote can no longer be accepted");
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
            userId: quote.clientId,
            title: "Quote Accepted! 🎉",
            body: `Your quote "${quote.title}" was accepted. Complete your booking now.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: creativeId,
        });

        await sendNotification(ctx, {
            userId: creativeId,
            title: "Quote Accepted",
            body: `We saved "${quote.title}" as a draft service — add photos and publish it if you'd like to offer it again.`,
            type: "GENERAL",
            meta: { screen: "service_detail", id: serviceId },
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✅ QUOTE ACCEPTED → BOOKING CREATED`,
                    ``,
                    `🆔 Quote ID:   ${args.quoteId}`,
                    `📋 Order No:   ${orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `👤 Client:     ${quote.clientId}`,
                    `🎨 Creative:   ${creativeId}`,
                    `📌 Title:      ${quote.title}`,
                    `💰 Budget:     $${(quote.budget / 100).toFixed(2)}`,
                    ``,
                    `ℹ️ Auto-generated DRAFT service created (${serviceId}) — no banner, awaiting creative review.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, bookingId, serviceId };
    },
});

export const acceptFinalOffer = mutation({
    args: {
        quoteId: v.id("quotes"),
        clientTimezone: v.string(),
    },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "CLIENT_FINAL") {
            throw new Error("No final offer to accept");
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
            userId: quote.clientId,
            title: "Final Offer Accepted! 🎉",
            body: `Your final offer for "${quote.title}" was accepted. Complete your booking now.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: creativeId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✅ FINAL OFFER ACCEPTED → BOOKING CREATED`,
                    ``,
                    `🆔 Quote ID:   ${args.quoteId}`,
                    `📋 Order No:   ${orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `👤 Client:     ${quote.clientId}`,
                    `🎨 Creative:   ${creativeId}`,
                    `📌 Title:      ${quote.title}`,
                    `💰 Budget:     $${(quote.budget / 100).toFixed(2)}`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, bookingId, serviceId };
    },
});

export const declineFinalOffer = mutation({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }
        if (quote.status !== "CLIENT_FINAL") {
            throw new Error("No final offer to decline");
        }

        await ctx.db.patch(args.quoteId, {
            status: "FINAL_DECLINED",
            awaitingRole: undefined,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: quote.clientId,
            title: "Final Offer Declined",
            body: `The creative declined your final offer for "${quote.title}". Deal is off.`,
            type: "GENERAL",
            meta: { screen: "quote_detail", id: args.quoteId },
            metaUser: creativeId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ CREATIVE DECLINED FINAL OFFER`,
                    ``,
                    `🆔 Quote ID: ${args.quoteId}`,
                    `👤 Client:   ${quote.clientId}`,
                    `🎨 Creative: ${creativeId}`,
                    `📌 Title:    ${quote.title}`,
                    `ℹ️ Deal is off permanently.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});
