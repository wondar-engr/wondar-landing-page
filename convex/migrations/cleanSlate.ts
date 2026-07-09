import { mutation } from "../_generated/server";

/**
 * CLEAN SLATE MIGRATION
 * Deletes all bookings and related data so we can start fresh
 * with proper timezone support.
 *
 * Deletes:
 *   - bookings
 *   - transactions
 *   - payments
 *   - refunds
 *   - platformProfits
 *   - bookingDisputes
 *
 * Does NOT delete:
 *   - profiles, creativeProfiles, clientProfiles
 *   - services
 *   - reviews (keep for now, orphaned but harmless)
 *   - stripeAccounts, stripeCustomers
 *   - systemConfig
 *   - noShowHistory
 *
 * Run from Convex dashboard → Functions → migrations/cleanSlate → Run
 */
export const cleanSlate = mutation({
    args: {},
    handler: async ctx => {
        const results: Record<string, number> = {};

        // 1. bookingDisputes
        const disputes = await ctx.db.query("bookingDisputes").collect();
        for (const d of disputes) await ctx.db.delete(d._id);
        results.bookingDisputes = disputes.length;

        // 2. platformProfits
        const profits = await ctx.db.query("platformProfits").collect();
        for (const p of profits) await ctx.db.delete(p._id);
        results.platformProfits = profits.length;

        // 3. refunds
        const refunds = await ctx.db.query("refunds").collect();
        for (const r of refunds) await ctx.db.delete(r._id);
        results.refunds = refunds.length;

        // 4. transactions
        const transactions = await ctx.db.query("transactions").collect();
        for (const t of transactions) await ctx.db.delete(t._id);
        results.transactions = transactions.length;

        // 5. payments
        const payments = await ctx.db.query("payments").collect();
        for (const p of payments) await ctx.db.delete(p._id);
        results.payments = payments.length;

        // 6. bookings — last since others reference it
        const bookings = await ctx.db.query("bookings").collect();
        for (const b of bookings) await ctx.db.delete(b._id);
        results.bookings = bookings.length;

        // 7. Reset noShowCount on all creativeProfiles
        const creativeProfiles = await ctx.db
            .query("creativeProfiles")
            .collect();
        for (const cp of creativeProfiles) {
            if ((cp.noShowCount ?? 0) > 0) {
                await ctx.db.patch(cp._id, { noShowCount: 0 });
            }
        }
        results.noShowCountsReset = creativeProfiles.length;

        // 8. Clear noShowHistory
        const noShowHistory = await ctx.db.query("noShowHistory").collect();
        for (const n of noShowHistory) await ctx.db.delete(n._id);
        results.noShowHistory = noShowHistory.length;

        console.log("[CLEAN SLATE]", JSON.stringify(results, null, 2));
        return { success: true, deleted: results };
    },
});
