import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getAuthUserId } from "@convex/auth";

// Lightweight — just the profile
export const getUserById = query({
    args: { id: v.id("profiles") },
    handler: async (ctx, { id }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        return await ctx.db.get(id);
    },
});

// Stats only — called by UserStatsBar
export const getUserStats = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const [bookingsAsClient, bookingsAsCreative, reviewsReceived] =
            await Promise.all([
                ctx.db
                    .query("bookings")
                    .withIndex("by_client", q => q.eq("clientId", userId))
                    .collect(),
                ctx.db
                    .query("bookings")
                    .withIndex("by_creative", q => q.eq("creativeId", userId))
                    .collect(),
                ctx.db
                    .query("reviews")
                    .withIndex("by_target", q => q.eq("targetId", userId))
                    .collect(),
            ]);

        const allBookings = [...bookingsAsClient, ...bookingsAsCreative];

        return {
            bookingsAsClient: bookingsAsClient.length,
            bookingsAsCreative: bookingsAsCreative.length,
            completedBookings: allBookings.filter(b => b.status === "COMPLETED")
                .length,
            cancelledBookings: allBookings.filter(b => b.status === "CANCELLED")
                .length,
            disputeBookings: allBookings.filter(b => b.status === "DISPUTE")
                .length,
            totalReviews: reviewsReceived.length,
            averageRating:
                reviewsReceived.length > 0
                    ? reviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
                      reviewsReceived.length
                    : 0,
        };
    },
});

// Overview tab — settings + onboarding
export const getUserSettings = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("userSettings")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});

// Creative tab
export const getCreativeProfile = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});

// Client tab
export const getClientProfile = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});

// Payments tab
export const getUserPaymentAccounts = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const [stripeAccount, stripeCustomer] = await Promise.all([
            ctx.db
                .query("stripeAccounts")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .first(),
            ctx.db
                .query("stripeCustomers")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .first(),
        ]);
        return { stripeAccount, stripeCustomer };
    },
});

// Suspensions tab
export const getUserSuspensions = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("userSuspensions")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .collect();
    },
});

// No-show history tab
export const getNoShowHistory = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("noShowHistory")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .collect();
    },
});
