"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getStripe } from "./index";
import { StripeError } from "../../utils/helpers/types";

const REFRESH_URL = `${process.env.APP_URL}/stripe/connect/refresh`;
const SUCCESS_URL = `${process.env.APP_URL}/stripe/connect/success`;

// ==========================================
// CREATE CONNECT ACCOUNT
// ==========================================

export const createConnectAccount = action({
    args: {
        userId: v.string(),
        email: v.string(),
        country: v.optional(v.string()),
        businessType: v.optional(
            v.union(v.literal("individual"), v.literal("company")),
        ),
    },
    handler: async (
        ctx,
        args,
    ): Promise<{ accountId: string; onboardingUrl: string }> => {
        const stripe = getStripe();

        // Check if user already has an account in our database
        const existingAccount = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: args.userId },
        );

        if (existingAccount?.stripeAccountId) {
            console.log(
                `[Connect] Found existing account: ${existingAccount.stripeAccountId}`,
            );

            // Verify the account still exists in Stripe
            try {
                // Account exists - generate new onboarding link
                const accountLink = await stripe.accountLinks.create({
                    account: existingAccount.stripeAccountId,
                    refresh_url: REFRESH_URL,
                    return_url: SUCCESS_URL,
                    type: "account_onboarding",
                });

                return {
                    accountId: existingAccount.stripeAccountId,
                    onboardingUrl: accountLink.url,
                };
            } catch (e) {
                const err = e as StripeError;
                // Account was deleted in Stripe, remove from our database
                if (
                    err &&
                    (err.code === "account_invalid" || err.statusCode === 404)
                ) {
                    console.log(
                        `[Connect] Account deleted in Stripe, removing from DB`,
                    );
                    await ctx.runMutation(
                        internal.lib.stripe.connectMutations
                            .deleteStripeAccount,
                        { id: existingAccount._id },
                    );
                } else {
                    throw err;
                }
            }
        }

        // Create new Express account
        console.log(`[Connect] Creating new account for user: ${args.userId}`);

        const account = await stripe.accounts.create({
            type: "express",
            country: args.country || "US",
            email: args.email,
            business_type: args.businessType || "individual",
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: {
                wondarUserId: args.userId,
            },
        });

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: REFRESH_URL,
            return_url: SUCCESS_URL,
            type: "account_onboarding",
        });

        // Save to database
        await ctx.runMutation(
            internal.lib.stripe.connectMutations.saveStripeAccount,
            {
                userId: args.userId,
                stripeAccountId: account.id,
                accountType: "express",
                country: args.country || "US",
                defaultCurrency: "usd",
            },
        );

        return {
            accountId: account.id,
            onboardingUrl: accountLink.url,
        };
    },
});

// ==========================================
// CREATE ONBOARDING LINK (for existing accounts)
// ==========================================

export const createOnboardingLink = action({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args): Promise<{ url: string } | null> => {
        const stripe = getStripe();

        const account = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: args.userId },
        );

        if (!account?.stripeAccountId) {
            return null;
        }

        console.log("Creating onboarding link for account:", account);

        const accountLink = await stripe.accountLinks.create({
            account: account.stripeAccountId,
            refresh_url: REFRESH_URL,
            return_url: SUCCESS_URL,
            type: "account_onboarding",
        });

        return { url: accountLink.url };
    },
});

// ==========================================
// CREATE DASHBOARD LINK (for managing account)
// ==========================================

export const createDashboardLink = action({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args): Promise<{ url: string } | null> => {
        const stripe = getStripe();

        const account = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: args.userId },
        );

        if (!account?.stripeAccountId) {
            return null;
        }

        const loginLink = await stripe.accounts.createLoginLink(
            account.stripeAccountId,
        );

        return { url: loginLink.url };
    },
});

// ==========================================
// GET ACCOUNT STATUS
// ==========================================

// Define the shape of your return data
interface AccountStatusResponse {
    hasAccount: boolean;
    status: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: {
        currentlyDue: string[];
        eventuallyDue: string[];
        pastDue: string[];
        disabledReason: string | null;
    } | null;
}

export const getAccountStatus = action({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args): Promise<AccountStatusResponse> => {
        const stripe = getStripe();

        const account = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: args.userId },
        );

        if (!account?.stripeAccountId) {
            return {
                hasAccount: false,
                status: null,
                chargesEnabled: false,
                payoutsEnabled: false,
                detailsSubmitted: false,
                requirements: null,
            };
        }

        // Fetch latest from Stripe
        const stripeAccount = await stripe.accounts.retrieve(
            account.stripeAccountId,
        );

        // Update our database with latest info
        await ctx.runMutation(
            internal.lib.stripe.connectMutations.updateStripeAccountStatus,
            {
                stripeAccountId: account.stripeAccountId,
                chargesEnabled: stripeAccount.charges_enabled,
                payoutsEnabled: stripeAccount.payouts_enabled,
                detailsSubmitted: stripeAccount.details_submitted ?? false,
                requirements: {
                    currentlyDue:
                        stripeAccount.requirements?.currently_due ?? [],
                    eventuallyDue:
                        stripeAccount.requirements?.eventually_due ?? [],
                    pastDue: stripeAccount.requirements?.past_due ?? [],
                    disabledReason:
                        stripeAccount.requirements?.disabled_reason ?? null,
                },
            },
        );

        return {
            hasAccount: true,
            status: account.status,
            chargesEnabled: stripeAccount.charges_enabled,
            payoutsEnabled: stripeAccount.payouts_enabled,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
            requirements: {
                currentlyDue: stripeAccount.requirements?.currently_due ?? [],
                eventuallyDue: stripeAccount.requirements?.eventually_due ?? [],
                pastDue: stripeAccount.requirements?.past_due ?? [],
                disabledReason:
                    stripeAccount.requirements?.disabled_reason ?? null,
            },
        };
    },
});

// Bulk delete for testing
export const deleteAllRestrictedAccounts = action({
    args: {},
    handler: async (ctx): Promise<{ deleted: number }> => {
        const stripe = getStripe();

        // Get all restricted accounts from our database
        const accounts = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getAllRestrictedAccounts,
            {},
        );

        let deleted = 0;

        for (const account of accounts) {
            try {
                // Delete from Stripe
                await stripe.accounts.del(account.stripeAccountId);
                console.log(`[Connect] Deleted: ${account.stripeAccountId}`);
            } catch (err) {
                console.log(
                    `[Connect] Could not delete ${account.stripeAccountId}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }

            // Delete from database
            await ctx.runMutation(
                internal.lib.stripe.connectMutations.deleteStripeAccount,
                {
                    id: account._id,
                },
            );

            deleted++;
        }

        return { deleted };
    },
});

// ==========================================
// DELETE ACCOUNT (for testing/cleanup)
// ==========================================

export const deleteConnectAccount = action({
    args: {
        userId: v.string(),
        deleteFromStripe: v.optional(v.boolean()),
    },
    handler: async (
        ctx,
        args,
    ): Promise<{ success: boolean; message: string }> => {
        const stripe = getStripe();

        const account = await ctx.runQuery(
            internal.lib.stripe.connectQueries.getStripeAccountByUserId,
            { userId: args.userId },
        );

        if (!account) {
            return { success: false, message: "No account found" };
        }

        // Delete from Stripe if requested
        if (args.deleteFromStripe) {
            try {
                await stripe.accounts.del(account.stripeAccountId);
                console.log(
                    `[Connect] Deleted Stripe account: ${account.stripeAccountId}`,
                );
            } catch (err) {
                console.log(
                    `[Connect] Failed to delete from Stripe: ${err instanceof Error ? err.message : String(err)}`,
                );
                // Continue to delete from our database anyway
            }
        }

        // Delete from our database
        await ctx.runMutation(
            internal.lib.stripe.connectMutations.deleteStripeAccount,
            {
                id: account._id,
            },
        );

        return { success: true, message: "Account deleted" };
    },
});
