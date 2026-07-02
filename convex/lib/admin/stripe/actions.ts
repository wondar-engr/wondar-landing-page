"use node";

import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { getStripe } from "../../stripe/index";
import { DisputeOutcomeUnion } from "@convex/unions";

export const issueStripeRefund = action({
    args: {
        bookingId: v.id("bookings"),
        amount: v.number(),
        outcome: DisputeOutcomeUnion,
        resolutionNote: v.string(),
        resolvedBy: v.string(),
        splitPercent: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        // Get booking
        const booking = await ctx.runQuery(
            internal.lib.internalQueries.bookings.getBookingById,
            { bookingId: args.bookingId },
        );
        if (!booking) throw new Error("Booking not found");

        // Find payment intent from transactions
        const upfrontTx = await ctx.runQuery(
            internal.lib.internalQueries.transactions.getUpfrontTransaction,
            { bookingId: args.bookingId },
        );

        if (!upfrontTx?.stripePaymentIntentId) {
            throw new Error(
                "No upfront payment found for this booking. Cannot issue refund.",
            );
        }

        let refundId: string | null = null;

        if (args.outcome === "CLIENT_FAVORED" || args.outcome === "SPLIT") {
            const refund = await stripe.refunds.create({
                payment_intent: upfrontTx.stripePaymentIntentId,
                amount: args.amount,
                reason: "requested_by_customer",
            });
            refundId = refund.id;

            // Update transaction record
            await ctx.runMutation(
                internal.lib.internalMuts.transactions.markTransactionRefunded,
                {
                    stripePaymentIntentId: upfrontTx.stripePaymentIntentId,
                    refundedAmount: args.amount,
                    refundReason: args.resolutionNote,
                },
            );
        }
        // Write resolution
        await ctx.runMutation(
            internal.lib.admin.booking.mutations.resolveDispute,
            {
                bookingId: args.bookingId,
                outcome: args.outcome,
                resolutionNote: args.resolutionNote,
                resolvedBy: args.resolvedBy,
                refundAmount: args.amount,
                splitPercent: args.splitPercent,
            },
        );

        // Telegram
        const outcomeLabels: Record<string, string> = {
            CLIENT_FAVORED: "💸 Full/Partial Refund to Client",
            SPLIT: "✂️ Split Refund",
            RELEASE_CREATIVE: "✅ Funds Released to Creative",
            NO_ACTION: "🔒 No Action Taken",
        };

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `⚖️ DISPUTE RESOLVED`,
                    ``,
                    `📋 Order:      ${booking.orderNo}`,
                    `🎯 Outcome:    ${outcomeLabels[args.outcome]}`,
                    args.outcome === "CLIENT_FAVORED" ||
                    args.outcome === "SPLIT"
                        ? `💰 Amount:     $${(args.amount / 100).toFixed(2)}`
                        : null,
                    `👤 Resolved by: ${args.resolvedBy}`,
                    `📝 Note:       ${args.resolutionNote}`,
                    refundId ? `🔑 Refund ID:  ${refundId}` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "DISPUTES",
            },
        );

        return { success: true, refundId };
    },
});
