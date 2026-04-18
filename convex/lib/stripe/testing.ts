"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { getStripe } from "./index";

// ==========================================
// TESTING ENDPOINTS (remove in production)
// ==========================================

export const listAllConnectedAccounts = action({
    args: {},
    handler: async () => {
        const stripe = getStripe();

        const accounts = await stripe.accounts.list({ limit: 100 });

        return accounts.data.map(acc => ({
            id: acc.id,
            email: acc.email,
            chargesEnabled: acc.charges_enabled,
            payoutsEnabled: acc.payouts_enabled,
            detailsSubmitted: acc.details_submitted,
            created: acc.created
                ? new Date(acc.created * 1000).toISOString()
                : new Date().toISOString(),
        }));
    },
});

export const deleteStripeAccountById = action({
    args: {
        stripeAccountId: v.string(),
    },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        try {
            await stripe.accounts.del(args.stripeAccountId);
            return {
                success: true,
                message: `Deleted ${args.stripeAccountId}`,
            };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    },
});

export const deleteAllRestrictedStripeAccounts = action({
    args: {},
    handler: async () => {
        const stripe = getStripe();

        const accounts = await stripe.accounts.list({ limit: 100 });

        const restricted = accounts.data.filter(
            acc => !acc.charges_enabled || !acc.payouts_enabled,
        );

        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const acc of restricted) {
            try {
                await stripe.accounts.del(acc.id);
                results.push({ id: acc.id, success: true });
            } catch (err: any) {
                results.push({
                    id: acc.id,
                    success: false,
                    error: err.message,
                });
            }
        }

        return {
            total: restricted.length,
            deleted: results.filter(r => r.success).length,
            results,
        };
    },
});

// Clean up orphaned accounts (in Stripe but not in our DB)
export const cleanupOrphanedAccounts = action({
    args: {},
    handler: async (
        ctx,
    ): Promise<{
        orphaned: number;
        deleted: number;
    }> => {
        const stripe = getStripe();

        const accounts = await stripe.accounts.list({ limit: 100 });

        // Get all account IDs from our database
        const ourAccounts = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getAllStripeAccountIds,
            {},
        );

        const ourAccountIds = new Set(ourAccounts.map(a => a.stripeAccountId));

        // Find orphaned accounts (in Stripe but not in our DB)
        const orphaned = accounts.data.filter(
            acc => !ourAccountIds.has(acc.id),
        );

        const results: { id: string; success: boolean }[] = [];

        for (const acc of orphaned) {
            try {
                await stripe.accounts.del(acc.id);
                results.push({ id: acc.id, success: true });
            } catch (err: any) {
                results.push({ id: acc.id, success: false });
            }
        }

        return {
            orphaned: orphaned.length,
            deleted: results.filter(r => r.success).length,
        };
    },
});

// Need to import internal
import { internal } from "../../_generated/api";
