import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ==========================================
// ACCOUNT EVENTS
// ==========================================

/**
 * Handle account.updated event
 * Updates the creative's Stripe account status
 */
export const handleAccountUpdated = internalMutation({
    args: {
        stripeAccountId: v.string(),
        chargesEnabled: v.boolean(),
        payoutsEnabled: v.boolean(),
        detailsSubmitted: v.boolean(),
        requirements: v.object({
            currentlyDue: v.array(v.string()),
            eventuallyDue: v.array(v.string()),
            pastDue: v.array(v.string()),
            disabledReason: v.union(v.string(), v.null()),
        }),
    },
    handler: async (ctx, args) => {
        // Find the Stripe account in our DB
        const stripeAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .unique();

        if (!stripeAccount) {
            console.log(
                `[Webhook] Stripe account not found: ${args.stripeAccountId}`,
            );
            return;
        }

        // Determine status based on capabilities and requirements
        let status: "PENDING" | "ACTIVE" | "RESTRICTED" | "DISABLED" =
            "PENDING";

        if (args.requirements.disabledReason) {
            status = "DISABLED";
        } else if (args.chargesEnabled && args.payoutsEnabled) {
            status = "ACTIVE";
        } else if (args.detailsSubmitted) {
            status = "RESTRICTED";
        }

        // Update the account
        await ctx.db.patch(stripeAccount._id, {
            chargesEnabled: args.chargesEnabled,
            payoutsEnabled: args.payoutsEnabled,
            detailsSubmitted: args.detailsSubmitted,
            status,
            updatedAt: Date.now(),
            ...(status === "ACTIVE" && !stripeAccount.onboardingCompletedAt
                ? { onboardingCompletedAt: Date.now() }
                : {}),
        });

        console.log(
            `[Webhook] Updated Stripe account ${args.stripeAccountId}: status=${status}`,
        );
    },
});

/**
 * Handle account.application.deauthorized event
 * Creative disconnected their Stripe account
 */
export const handleAccountDeauthorized = internalMutation({
    args: {
        stripeAccountId: v.string(),
    },
    handler: async (ctx, args) => {
        const stripeAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .unique();

        if (!stripeAccount) {
            console.log(
                `[Webhook] Stripe account not found for deauth: ${args.stripeAccountId}`,
            );
            return;
        }

        await ctx.db.patch(stripeAccount._id, {
            status: "DISABLED",
            chargesEnabled: false,
            payoutsEnabled: false,
            updatedAt: Date.now(),
        });

        console.log(
            `[Webhook] Deauthorized Stripe account: ${args.stripeAccountId}`,
        );
    },
});

// ==========================================
// PAYMENT EVENTS
// ==========================================

/**
 * Handle payment_intent.succeeded event
 * Mark transaction as successful, update booking
 */
export const handlePaymentSucceeded = internalMutation({
    args: {
        stripePaymentIntentId: v.string(),
        amount: v.number(),
        currency: v.string(),
        metadata: v.any(),
    },
    handler: async (ctx, args) => {
        // Find the transaction
        const transaction = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .unique();

        if (!transaction) {
            console.log(
                `[Webhook] Transaction not found for PI: ${args.stripePaymentIntentId}`,
            );
            return;
        }

        // Update transaction status
        await ctx.db.patch(transaction._id, {
            status: "SUCCEEDED",
            completedAt: Date.now(),
        });

        // Update booking status
        const booking = await ctx.db.get(transaction.bookingId);
        if (booking) {
            await ctx.db.patch(booking._id, {
                status: "AWAITING_CONFIRMATION",
            });
        }

        // Update payment record if exists
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_booking", q =>
                q.eq("bookingId", transaction.bookingId),
            )
            .unique();

        if (payment) {
            await ctx.db.patch(payment._id, {
                status: "SUCCESS",
            });
        }

        console.log(
            `[Webhook] Payment succeeded: ${args.stripePaymentIntentId}`,
        );
    },
});

/**
 * Handle payment_intent.payment_failed event
 */
export const handlePaymentFailed = internalMutation({
    args: {
        stripePaymentIntentId: v.string(),
        errorMessage: v.string(),
    },
    handler: async (ctx, args) => {
        const transaction = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .unique();

        if (!transaction) {
            console.log(
                `[Webhook] Transaction not found for failed PI: ${args.stripePaymentIntentId}`,
            );
            return;
        }

        await ctx.db.patch(transaction._id, {
            status: "FAILED",
        });

        // Update payment record if exists
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_booking", q =>
                q.eq("bookingId", transaction.bookingId),
            )
            .unique();

        if (payment) {
            await ctx.db.patch(payment._id, {
                status: "FAILED",
            });
        }

        console.log(
            `[Webhook] Payment failed: ${args.stripePaymentIntentId} - ${args.errorMessage}`,
        );
    },
});

// ==========================================
// REFUND EVENTS
// ==========================================

/**
 * Handle charge.refunded event
 */
export const handleChargeRefunded = internalMutation({
    args: {
        stripeChargeId: v.string(),
        amountRefunded: v.number(),
        paymentIntentId: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const paymentIntentId = args.paymentIntentId;
        if (!paymentIntentId) {
            console.log(
                `[Webhook] No payment intent for refunded charge: ${args.stripeChargeId}`,
            );
            return;
        }

        const transaction = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", paymentIntentId),
            )
            .unique();

        if (!transaction) {
            console.log(
                `[Webhook] Transaction not found for refund: ${paymentIntentId}`,
            );
            return;
        }

        // Determine if fully or partially refunded
        const isFullRefund = args.amountRefunded >= transaction.totalCharged;

        await ctx.db.patch(transaction._id, {
            status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
            refundedAmount: args.amountRefunded,
            refundedAt: Date.now(),
        });

        // Update booking status
        const booking = await ctx.db.get(transaction.bookingId);
        if (booking && isFullRefund) {
            await ctx.db.patch(booking._id, {
                status: "REFUNDED",
            });
        }

        // Update payment record
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_booking", q =>
                q.eq("bookingId", transaction.bookingId),
            )
            .unique();

        if (payment) {
            await ctx.db.patch(payment._id, {
                status: "REFUNDED",
            });
        }

        console.log(
            `[Webhook] Charge refunded: ${args.stripeChargeId} - $${args.amountRefunded / 100}`,
        );
    },
});

// ==========================================
// PAYOUT EVENTS
// ==========================================

/**
 * Handle payout.paid event
 */
export const handlePayoutPaid = internalMutation({
    args: {
        stripePayoutId: v.string(),
        amount: v.number(),
        arrivalDate: v.number(),
    },
    handler: async (ctx, args) => {
        const payout = await ctx.db
            .query("payouts")
            .withIndex("by_stripePayoutId", q =>
                q.eq("stripePayoutId", args.stripePayoutId),
            )
            .unique();

        if (!payout) {
            // This might be a payout we didn't create (automatic Stripe payout)
            // We could create a record here if needed
            console.log(
                `[Webhook] Payout not found (may be automatic): ${args.stripePayoutId}`,
            );
            return;
        }

        await ctx.db.patch(payout._id, {
            status: "PAID",
            paidAt: Date.now(),
            updatedAt: Date.now(),
        });

        console.log(
            `[Webhook] Payout paid: ${args.stripePayoutId} - $${args.amount / 100}`,
        );
    },
});

/**
 * Handle payout.failed event
 */
export const handlePayoutFailed = internalMutation({
    args: {
        stripePayoutId: v.string(),
        failureCode: v.union(v.string(), v.null()),
        failureMessage: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const payout = await ctx.db
            .query("payouts")
            .withIndex("by_stripePayoutId", q =>
                q.eq("stripePayoutId", args.stripePayoutId),
            )
            .unique();

        if (!payout) {
            console.log(
                `[Webhook] Payout not found for failure: ${args.stripePayoutId}`,
            );
            return;
        }

        await ctx.db.patch(payout._id, {
            status: "FAILED",
            failureCode: args.failureCode ?? undefined,
            failureMessage: args.failureMessage ?? undefined,
            updatedAt: Date.now(),
        });

        console.log(
            `[Webhook] Payout failed: ${args.stripePayoutId} - ${args.failureCode}`,
        );
    },
});

/**
 * Handle payout.created event (for automatic payouts)
 * Creates a record for payouts initiated by Stripe automatically
 */
export const handlePayoutCreated = internalMutation({
    args: {
        stripePayoutId: v.string(),
        stripeAccountId: v.string(),
        amount: v.number(),
        currency: v.string(),
        arrivalDate: v.number(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if we already have this payout
        const existingPayout = await ctx.db
            .query("payouts")
            .withIndex("by_stripePayoutId", q =>
                q.eq("stripePayoutId", args.stripePayoutId),
            )
            .unique();

        if (existingPayout) {
            console.log(
                `[Webhook] Payout already exists: ${args.stripePayoutId}`,
            );
            return;
        }

        // Find the creative by their Stripe account ID
        const stripeAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .unique();

        if (!stripeAccount) {
            console.log(
                `[Webhook] Stripe account not found for payout: ${args.stripeAccountId}`,
            );
            return;
        }

        // Map Stripe status to our status
        const statusMap: Record<
            string,
            "PENDING" | "IN_TRANSIT" | "PAID" | "FAILED" | "CANCELED"
        > = {
            pending: "PENDING",
            in_transit: "IN_TRANSIT",
            paid: "PAID",
            failed: "FAILED",
            canceled: "CANCELED",
        };

        const status = statusMap[args.status] || "PENDING";

        // Create the payout record
        await ctx.db.insert("payouts", {
            creativeId: stripeAccount.userId,
            stripeAccountId: args.stripeAccountId,
            stripePayoutId: args.stripePayoutId,
            amount: args.amount,
            currency: args.currency.toUpperCase(),
            status,
            arrivalDate: args.arrivalDate,
            type: "AUTOMATIC",
            updatedAt: Date.now(),
        });

        console.log(
            `[Webhook] Created payout record: ${args.stripePayoutId} - $${args.amount / 100}`,
        );
    },
});

// ==========================================
// TRANSFER EVENTS
// ==========================================

/**
 * Handle transfer.created event
 * When funds are transferred to a connected account
 */
export const handleTransferCreated = internalMutation({
    args: {
        stripeTransferId: v.string(),
        amount: v.number(),
        currency: v.string(),
        destinationAccountId: v.string(),
        sourceTransactionId: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const sourceTransactionId = args.sourceTransactionId;
        // If we have a source transaction (payment intent), update it
        if (sourceTransactionId) {
            const transaction = await ctx.db
                .query("transactions")
                .withIndex("by_stripePaymentIntentId", q =>
                    q.eq("stripePaymentIntentId", sourceTransactionId),
                )
                .unique();

            if (transaction) {
                await ctx.db.patch(transaction._id, {
                    stripeTransferId: args.stripeTransferId,
                });
                console.log(
                    `[Webhook] Updated transaction with transfer: ${args.stripeTransferId}`,
                );
            }
        }

        console.log(
            `[Webhook] Transfer created: ${args.stripeTransferId} - $${args.amount / 100} to ${args.destinationAccountId}`,
        );
    },
});
