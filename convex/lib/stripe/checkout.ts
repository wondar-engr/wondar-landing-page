"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { getStripe } from "./index";

const APP_URL = process.env.APP_URL || "https://example.com";
const SUCCESS_URL = `${APP_URL}/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const CANCEL_URL = `${APP_URL}/stripe/checkout/cancel`;

function money(n: number) {
    return Math.max(0, Math.round(n));
}

export const createUpfrontCheckoutSession = action({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getBookingForPaymentInternal,
            { bookingId },
        );
        if (!booking) throw new Error("Booking not found");

        if (booking.status !== "CONFIRMED") {
            throw new Error("Booking must be confirmed before upfront payment");
        }
        if (booking.paymentPhase !== "UPFRONT_PENDING") {
            throw new Error("Upfront payment is not pending");
        }

        const stripeAccount = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: booking.creativeId },
        );
        if (!stripeAccount?.stripeAccountId || !stripeAccount.chargesEnabled) {
            throw new Error("Creative payout account is not ready");
        }

        const upfrontAmount = money(booking.upfrontChargeAmount);
        const creativeUpfrontPayout = money(
            booking.bookingFee - booking.platformCreativeFeeAmount,
        );

        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            success_url: SUCCESS_URL,
            cancel_url: CANCEL_URL,
            payment_method_types: ["card"],
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: booking.currency || "usd",
                        unit_amount: upfrontAmount,
                        product_data: {
                            name: `Booking upfront payment (${booking.orderNo})`,
                            description: "Booking fee + client platform fee",
                        },
                    },
                },
            ],
            payment_intent_data: {
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
            },
            metadata: {
                bookingId: booking._id,
                phase: "UPFRONT",
            },
        });

        if (!session.url) throw new Error("Failed to create checkout session");

        return { url: session.url, sessionId: session.id };
    },
});

export const createFinalCheckoutSession = action({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.runQuery(
            internal.lib.internalQueries.stripe.getBookingForPaymentInternal,
            { bookingId },
        );
        if (!booking) throw new Error("Booking not found");

        if (
            !(
                booking.status === "IN_PROGRESS" ||
                booking.status === "COMPLETED"
            )
        ) {
            throw new Error(
                "Final payment requires in-progress/completed booking",
            );
        }
        if (booking.paymentPhase !== "FINAL_PENDING") {
            throw new Error("Final payment is not pending");
        }

        const stripeAccount = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: booking.creativeId },
        );
        if (!stripeAccount?.stripeAccountId || !stripeAccount.chargesEnabled) {
            throw new Error("Creative payout account is not ready");
        }

        const finalAmount = money(booking.remainingDueAmount);

        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            success_url: SUCCESS_URL,
            cancel_url: CANCEL_URL,
            payment_method_types: ["card"],
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: booking.currency || "usd",
                        unit_amount: finalAmount,
                        product_data: {
                            name: `Final payment (${booking.orderNo})`,
                            description: "Remaining service balance",
                        },
                    },
                },
            ],
            payment_intent_data: {
                transfer_data: {
                    destination: stripeAccount.stripeAccountId,
                    amount: finalAmount,
                },
                metadata: {
                    bookingId: booking._id,
                    phase: "FINAL",
                    clientId: booking.clientId,
                    creativeId: booking.creativeId,
                    serviceId: booking.serviceId,
                },
            },
            metadata: {
                bookingId: booking._id,
                phase: "FINAL",
            },
        });

        if (!session.url) throw new Error("Failed to create checkout session");

        return { url: session.url, sessionId: session.id };
    },
});
