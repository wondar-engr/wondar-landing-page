// ==========================================
// INTERNAL MUTATIONS
// ==========================================

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const saveStripeAccount = internalMutation({
    args: {
        userId: v.string(),
        stripeAccountId: v.string(),
        accountType: v.union(v.literal("express"), v.literal("standard")),
        country: v.string(),
        defaultCurrency: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("stripeAccounts", {
            userId: args.userId,
            stripeAccountId: args.stripeAccountId,
            accountType: args.accountType,
            status: "PENDING",
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            payoutSchedule: {
                interval: "DAILY",
            },
            country: args.country,
            defaultCurrency: args.defaultCurrency,
            updatedAt: Date.now(),
        });
    },
});

export const updateStripeAccountStatus = internalMutation({
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
        const account = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .first();

        if (!account) return;

        // Determine status
        let status: "PENDING" | "RESTRICTED" | "ACTIVE" | "DISABLED" =
            "PENDING";

        if (
            args.chargesEnabled &&
            args.payoutsEnabled &&
            args.detailsSubmitted
        ) {
            status = "ACTIVE";
        } else if (args.requirements.disabledReason) {
            if (args.requirements.disabledReason.includes("rejected")) {
                status = "DISABLED";
            } else {
                status = "RESTRICTED";
            }
        } else if (args.detailsSubmitted) {
            status = "RESTRICTED";
        }

        await ctx.db.patch(account._id, {
            status,
            chargesEnabled: args.chargesEnabled,
            payoutsEnabled: args.payoutsEnabled,
            detailsSubmitted: args.detailsSubmitted,
            updatedAt: Date.now(),
            ...(status === "ACTIVE" && !account.onboardingCompletedAt
                ? { onboardingCompletedAt: Date.now() }
                : {}),
        });
    },
});

export const deleteStripeAccount = internalMutation({
    args: {
        id: v.id("stripeAccounts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const createPayoutRecord = internalMutation({
    args: {
        creativeId: v.string(),
        stripeAccountId: v.string(),
        stripePayoutId: v.string(),
        amount: v.number(),
        currency: v.string(),
        arrivalDate: v.number(),
        status: v.union(
            v.literal("PENDING"),
            v.literal("IN_TRANSIT"),
            v.literal("PAID"),
            v.literal("FAILED"),
            v.literal("CANCELED"),
        ),
        type: v.union(v.literal("AUTOMATIC"), v.literal("MANUAL")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("payouts")
            .withIndex("by_stripePayoutId", q =>
                q.eq("stripePayoutId", args.stripePayoutId),
            )
            .first();

        if (existing) return existing._id;

        return await ctx.db.insert("payouts", {
            ...args,
            updatedAt: Date.now(),
        });
    },
});

export const updateAccountBalance = internalMutation({
    args: {
        stripeAccountId: v.string(),
        balance: v.number(),
        pendingBalance: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_stripeAccountId", q =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .unique();

        if (!account) {
            console.log(
                `[Webhook] Account not found for balance update: ${args.stripeAccountId}`,
            );
            return;
        }

        await ctx.db.patch(account._id, {
            balance: args.balance,
            pendingBalance: args.pendingBalance,
            updatedAt: Date.now(),
        });
    },
});
