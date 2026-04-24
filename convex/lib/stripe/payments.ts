"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { getStripe } from "./index";

export const createUpfrontPaymentIntent = action({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getBookingForPaymentInternal,
            { bookingId },
        );
        if (!booking) throw new Error("Booking not found");

        if (booking.status !== "CONFIRMED") {
            throw new Error("Booking must be confirmed before payment");
        }
        if (booking.paymentPhase !== "UPFRONT_PENDING") {
            throw new Error("Upfront payment is not pending");
        }

        const stripeAccount = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getStripeAccount,
            { userId: booking.creativeId },
        );

        if (!stripeAccount?.stripeAccountId || !stripeAccount.chargesEnabled) {
            throw new Error("Creative payout account is not ready");
        }

        const amount = booking.upfrontChargeAmount; // cents
        if (!amount || amount <= 0) throw new Error("Invalid upfront amount");

        const creativeUpfrontPayout = Math.max(
            booking.bookingFee - booking.platformCreativeFeeAmount,
            0,
        );

        const stripe = getStripe();

        const intent = await stripe.paymentIntents.create({
            amount,
            currency: booking.currency || "usd",
            automatic_payment_methods: { enabled: true },
            transfer_data: {
                destination: stripeAccount.stripeAccountId,
                amount: creativeUpfrontPayout,
            },
            metadata: {
                bookingId: booking._id,
                phase: "UPFRONT",
                clientId: booking.clientId,
                creativeId: booking.creativeId,
                serviceId: booking.serviceId,
            },
        });

        await ctx.runMutation(
            internal.lib.internalMuts.stripe.createPendingTransactionInternal,
            {
                bookingId: booking._id,
                clientId: booking.clientId,
                creativeId: booking.creativeId,
                serviceId: booking.serviceId,
                stripePaymentIntentId: intent.id,
                currency: booking.currency || "usd",
                phase: "UPFRONT",
                sequence: 1,
                totalCharged: amount,
                creativeEarnings: creativeUpfrontPayout,
                platformEarnings: amount - creativeUpfrontPayout,
            },
        );

        return {
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
        };
    },
});

export const createFinalPaymentIntent = action({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getBookingForPaymentInternal,
            { bookingId },
        );
        if (!booking) throw new Error("Booking not found");

        if (
            booking.status !== "COMPLETED" &&
            booking.status !== "IN_PROGRESS"
        ) {
            throw new Error(
                "Final payment requires completed/in-progress booking",
            );
        }
        if (booking.paymentPhase !== "FINAL_PENDING") {
            throw new Error("Final payment is not pending");
        }

        const stripeAccount = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getStripeAccount,
            { userId: booking.creativeId },
        );

        if (!stripeAccount?.stripeAccountId || !stripeAccount.chargesEnabled) {
            throw new Error("Creative payout account is not ready");
        }

        const amount = booking.remainingDueAmount; // cents
        if (!amount || amount <= 0) throw new Error("Invalid final amount");

        const stripe = getStripe();

        const intent = await stripe.paymentIntents.create({
            amount,
            currency: booking.currency || "usd",
            automatic_payment_methods: { enabled: true },
            transfer_data: {
                destination: stripeAccount.stripeAccountId,
                amount, // full remaining goes to creative
            },
            metadata: {
                bookingId: booking._id,
                phase: "FINAL",
                clientId: booking.clientId,
                creativeId: booking.creativeId,
                serviceId: booking.serviceId,
            },
        });

        await ctx.runMutation(
            internal.lib.internalMuts.stripe.createPendingTransactionInternal,
            {
                bookingId: booking._id,
                clientId: booking.clientId,
                creativeId: booking.creativeId,
                serviceId: booking.serviceId,
                stripePaymentIntentId: intent.id,
                currency: booking.currency || "usd",
                phase: "FINAL",
                sequence: 2,
                totalCharged: amount,
                creativeEarnings: amount,
                platformEarnings: 0,
            },
        );

        return {
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
        };
    },
});
