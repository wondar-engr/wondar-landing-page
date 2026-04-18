import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { UserTypeUnion } from "../../../unions";
import { sendNotification } from "../../../lib/notifications";

// Check if user is supporting another user
export const isSupporting = query({
    args: {
        supporterId: v.string(),
        supportedId: v.string(),
    },
    handler: async (ctx, args) => {
        const support = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q
                    .eq("supporterId", args.supporterId)
                    .eq("supportedId", args.supportedId),
            )
            .first();

        return !!support;
    },
});

// Toggle support (add or remove)
export const toggleSupport = mutation({
    args: {
        supporterId: v.string(),
        supportedId: v.string(),
        supporterType: UserTypeUnion,
        supportedType: UserTypeUnion,
    },
    handler: async (ctx, args) => {
        // Check if already supporting
        const existing = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q
                    .eq("supporterId", args.supporterId)
                    .eq("supportedId", args.supportedId),
            )
            .first();

        if (existing) {
            // Remove support
            await ctx.db.delete(existing._id);
            return { action: "removed" };
        } else {
            // Add support
            await ctx.db.insert("supports", {
                supporterId: args.supporterId,
                supportedId: args.supportedId,
                supporterType: args.supporterType,
                supportedType: args.supportedType,
                createdAt: Date.now(),
            });

            // Get supporter's name
            const supporterProfile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", args.supporterId))
                .first();

            const supporterName = supporterProfile
                ? `${supporterProfile.firstName || ""} ${supporterProfile.lastName || ""}`.trim()
                : "Someone";

            // Send notification - ONE FUNCTION, THAT'S IT
            await sendNotification(ctx, {
                userId: args.supportedId,
                title: "New Supporter! 🎉",
                body: `${supporterName} is now supporting you.`,
                type: "GENERAL",
                meta: { screen: "supporters" },
                metaUser: args.supporterId,
            });
            return { action: "added" };
        }
    },
});

// Get supporters count for a user
export const getSupportersCount = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const supporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", args.userId))
            .collect();

        return supporters.length;
    },
});

// Get supporting count for a user
export const getSupportingCount = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const supporting = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", args.userId))
            .collect();

        return supporting.length;
    },
});

// Get list of supporters
export const getSupporters = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const supporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", args.userId))
            .order("desc")
            .take(args.limit || 50);

        // Get user profiles for each supporter
        const profiles = await Promise.all(
            supporters.map(async support => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supporterId),
                    )
                    .first();

                return {
                    ...support,
                    profile,
                };
            }),
        );

        return profiles;
    },
});

// Get list of users being supported
export const getSupporting = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const supporting = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", args.userId))
            .order("desc")
            .take(args.limit || 50);

        // Get user profiles for each supported user
        const profiles = await Promise.all(
            supporting.map(async support => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supportedId),
                    )
                    .first();

                // If creative, get creative profile too
                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supportedId),
                    )
                    .first();

                return {
                    ...support,
                    profile,
                    creativeProfile,
                };
            }),
        );

        return profiles;
    },
});

// Check for mutual support (both support each other)
export const isMutualSupport = query({
    args: {
        userId1: v.string(),
        userId2: v.string(),
    },
    handler: async (ctx, args) => {
        const support1 = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q
                    .eq("supporterId", args.userId1)
                    .eq("supportedId", args.userId2),
            )
            .first();

        const support2 = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q
                    .eq("supporterId", args.userId2)
                    .eq("supportedId", args.userId1),
            )
            .first();

        return !!support1 && !!support2;
    },
});
