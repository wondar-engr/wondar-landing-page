import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getChargeProcessingFee, inspectChargeFee } from "../lib/stripe/fees";

/**
 * Ops scripts for the platform ledger. Run from the Convex dashboard:
 *   scripts/platformLedger:reconcile  { "dryRun": true }   (default, read only)
 *   scripts/platformLedger:reconcile  { "dryRun": false }  (writes fees + profits)
 *   scripts/platformLedger:reconcile  { "inspect": true, "limit": 3 }
 *       adds Stripe's raw fee details to each row, to see why a fee reads 0
 */

type StripeTransaction = {
    _id: Id<"transactions">;
    phase: "UPFRONT" | "FINAL";
    stripeChargeId: string;
    totalCharged: number;
    creativeEarnings: number;
    platformEarnings: number;
    stripeFee: number | undefined;
};

export const listStripeTransactions = internalQuery({
    args: {},
    handler: async ctx => {
        const succeeded = await ctx.db
            .query("transactions")
            .withIndex("by_status", q => q.eq("status", "SUCCEEDED"))
            .collect();

        return succeeded
            .filter(t => t.source !== "OFFLINE" && t.stripeChargeId)
            .map(t => ({
                _id: t._id,
                phase: t.phase,
                stripeChargeId: t.stripeChargeId!,
                totalCharged: t.totalCharged,
                creativeEarnings: t.creativeEarnings,
                platformEarnings: t.platformEarnings,
                stripeFee: t.stripeFee,
            }));
    },
});

type LedgerRow = {
    transactionId: string;
    stripeChargeId: string;
    phase: "UPFRONT" | "FINAL";
    totalCharged: number;
    platformEarnings: number;
    stripeFee: number | null;
    net: number | null;
    details?: unknown; // only with inspect: true
};

type LedgerSummary = {
    payments: number;
    platformEarnings: number;
    stripeFees: number;
    net: number;
};

type ReconcileResult = {
    dryRun: boolean;
    upfront: LedgerSummary;
    final: LedgerSummary;
    total: LedgerSummary;
    failures: { transactionId: string; error: string }[];
    rows: LedgerRow[];
};

export const reconcile = internalAction({
    args: {
        dryRun: v.optional(v.boolean()),
        inspect: v.optional(v.boolean()),
        limit: v.optional(v.number()), // only check the first N payments
    },
    handler: async (
        ctx,
        { dryRun = true, inspect = false, limit },
    ): Promise<ReconcileResult> => {
        const transactions: StripeTransaction[] = await ctx.runQuery(
            internal.scripts.platformLedger.listStripeTransactions,
            {},
        );

        const rows: LedgerRow[] = [];
        const failures: { transactionId: string; error: string }[] = [];

        const toCheck = limit ? transactions.slice(0, limit) : transactions;

        for (const t of toCheck) {
            try {
                // Stored fees are final, only fetch the missing ones
                const stripeFee =
                    t.stripeFee ||
                    (await getChargeProcessingFee(t.stripeChargeId));

                if (!dryRun) {
                    // A zero fee is never stored: real charges always cost something,
                    // so 0 means the number is unknown and is refetched next run
                    if (!t.stripeFee && stripeFee) {
                        await ctx.runMutation(
                            internal.stripe.ledger.recordStripeFee,
                            { transactionId: t._id, stripeFee },
                        );
                    }
                    await ctx.runMutation(
                        internal.stripe.ledger.backfillPlatformProfits,
                        { transactionId: t._id },
                    );
                }

                rows.push({
                    transactionId: t._id,
                    stripeChargeId: t.stripeChargeId,
                    phase: t.phase,
                    totalCharged: t.totalCharged,
                    platformEarnings: t.platformEarnings,
                    stripeFee,
                    ...(inspect
                        ? { details: await inspectChargeFee(t.stripeChargeId) }
                        : {}),
                    // Wondar's real take on this payment, in cents
                    net:
                        stripeFee === null
                            ? null
                            : t.platformEarnings - stripeFee,
                });
            } catch (error) {
                failures.push({
                    transactionId: t._id,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        const sum = (
            list: LedgerRow[],
            pick: (r: LedgerRow) => number | null,
        ) => list.reduce((total, r) => total + (pick(r) ?? 0), 0);

        const summarise = (list: LedgerRow[]): LedgerSummary => ({
            payments: list.length,
            platformEarnings: sum(list, r => r.platformEarnings),
            stripeFees: sum(list, r => r.stripeFee),
            net: sum(list, r => r.net),
        });

        return {
            dryRun,
            upfront: summarise(rows.filter(r => r.phase === "UPFRONT")),
            final: summarise(rows.filter(r => r.phase === "FINAL")),
            total: summarise(rows),
            failures,
            rows,
        };
    },
});
