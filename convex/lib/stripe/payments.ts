"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { getStripe } from "./index";
import { getOrCreateStripeCustomer } from "./customerHelpers"; // ← new
import { throwAppError } from "@convex/utils/helpers/error";

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

        // ← Get or create Stripe customer for this client
        const stripeCustomerId = await getOrCreateStripeCustomer(
            ctx,
            booking.clientId,
        );

        const stripe = getStripe();

        const intent = await stripe.paymentIntents.create({
            amount,
            currency: booking.currency || "usd",
            customer: stripeCustomerId,
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
        if (!booking) throwAppError("Booking not found.");

        // New flow: pay any time after the upfront payment, before the service starts
        const payableNow =
            booking.status === "PAID" &&
            booking.paymentPhase === "UPFRONT_PAID";
        // Legacy flow: old bookings that were already completed under the old rules
        const legacyPayable =
            (booking.status === "COMPLETED" ||
                booking.status === "IN_PROGRESS") &&
            booking.paymentPhase === "FINAL_PENDING";
        if (!payableNow && !legacyPayable) {
            throwAppError(
                "The final payment isn't available for this booking right now.",
            );
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

        const stripeCustomerId = await getOrCreateStripeCustomer(
            ctx,
            booking.clientId,
        );

        const stripe = getStripe();

        const intent = await stripe.paymentIntents.create({
            amount,
            currency: booking.currency || "usd",
            customer: stripeCustomerId,
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
