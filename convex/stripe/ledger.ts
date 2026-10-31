import { v } from "convex/values";
import { internalMutation, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Platform ledger: records what Wondar earns (platformProfits) and what Stripe
 * charges Wondar to process each payment (transactions.stripeFee).
 *
 * Wondar's fee never moves as a separate payment. It stays in the platform
 * Stripe balance, so this ledger is the only place the number exists.
 */

/**
 * Write the CLIENT_FEE / CREATIVE_FEE rows for a succeeded transaction.
 * Idempotent: a transaction that already has rows is skipped.
 * Returns the number of rows written.
 */
export async function recordPlatformProfits(
    ctx: MutationCtx,
    transaction: Doc<"transactions">,
    booking: Doc<"bookings">,
): Promise<number> {
    // Offline payments never touch Wondar, FINAL payments carry no fee
    if (transaction.source === "OFFLINE" || transaction.platformEarnings <= 0) {
        return 0;
    }

    const existing = await ctx.db
        .query("platformProfits")
        .withIndex("by_transactionId", q =>
            q.eq("transactionId", transaction._id),
        )
        .first();
    if (existing) return 0;

    const clientFee = Math.min(
        booking.platformClientFeeAmount,
        transaction.platformEarnings,
    );
    const creativeFee = transaction.platformEarnings - clientFee;
    const now = Date.now();

    const rows = [
        { source: "CLIENT_FEE" as const, amount: clientFee },
        { source: "CREATIVE_FEE" as const, amount: creativeFee },
    ].filter(row => row.amount > 0);

    for (const row of rows) {
        await ctx.db.insert("platformProfits", {
            bookingId: transaction.bookingId,
            transactionId: transaction._id,
            source: row.source,
            amount: row.amount,
            currency: transaction.currency,
            status: "RECOGNIZED",
            recognizedAt: now,
        });
    }

    return rows.length;
}

/**
 * Mark every recognised profit row of a transaction as reversed (full refund).
 */
export async function reversePlatformProfits(
    ctx: MutationCtx,
    transactionId: Id<"transactions">,
    note: string,
): Promise<number> {
    const rows = await ctx.db
        .query("platformProfits")
        .withIndex("by_transactionId", q =>
            q.eq("transactionId", transactionId),
        )
        .collect();

    const now = Date.now();
    let reversed = 0;
    for (const row of rows) {
        if (row.status === "REVERSED") continue;
        await ctx.db.patch(row._id, {
            status: "REVERSED",
            reversedAt: now,
            note,
        });
        reversed++;
    }
    return reversed;
}

/**
 * Store Stripe's processing fee on a transaction (called after the webhook
 * or the backfill reads it from the charge's balance transaction).
 */
export const recordStripeFee = internalMutation({
    args: {
        transactionId: v.id("transactions"),
        stripeFee: v.number(), // cents
    },
    handler: async (ctx, { transactionId, stripeFee }) => {
        await ctx.db.patch(transactionId, {
            stripeFee,
            stripeFeeRecordedAt: Date.now(),
        });
    },
});

/**
 * Backfill helper: write profit rows for an already-succeeded transaction.
 */
export const backfillPlatformProfits = internalMutation({
    args: { transactionId: v.id("transactions") },
    handler: async (ctx, { transactionId }) => {
        const transaction = await ctx.db.get(transactionId);
        if (!transaction || transaction.status !== "SUCCEEDED") return 0;

        const booking = await ctx.db.get(transaction.bookingId);
        if (!booking) return 0;

        return await recordPlatformProfits(ctx, transaction, booking);
    },
});
