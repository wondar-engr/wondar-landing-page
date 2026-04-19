import { query, mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex/auth";

// Get users supporting me (my supporters)
export const getMySupporters = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 50 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const supporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", userId))
            .order("desc")
            .take(limit);

        const enrichedSupporters = await Promise.all(
            supporters.map(async support => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supporterId),
                    )
                    .first();

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supporterId),
                    )
                    .first();

                // Check if I'm supporting them back
                const isSupportingBack = await ctx.db
                    .query("supports")
                    .withIndex("by_both", q =>
                        q
                            .eq("supporterId", userId)
                            .eq("supportedId", support.supporterId),
                    )
                    .first();

                return {
                    id: support._id,
                    oderId: support.supporterId,
                    firstName: profile?.firstName,
                    lastName: profile?.lastName,
                    avatar: profile?.avatar,
                    businessName: creativeProfile?.businessName,
                    bio: creativeProfile?.aboutMe,
                    isCreative: !!creativeProfile,
                    isSupportingBack: !!isSupportingBack,
                    supportedAt: support.createdAt,
                };
            }),
        );

        return enrichedSupporters;
    },
});

// Get users I'm supporting
export const getMySupporting = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 50 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const supporting = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", userId))
            .order("desc")
            .take(limit);

        const enrichedSupporting = await Promise.all(
            supporting.map(async support => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supportedId),
                    )
                    .first();

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", support.supportedId),
                    )
                    .first();

                return {
                    id: support._id,
                    oderId: support.supportedId,
                    firstName: profile?.firstName,
                    lastName: profile?.lastName,
                    avatar: profile?.avatar,
                    businessName: creativeProfile?.businessName,
                    bio: creativeProfile?.aboutMe,
                    isCreative: !!creativeProfile,
                    supportedAt: support.createdAt,
                };
            }),
        );

        return enrichedSupporting;
    },
});

// Get user profile for detail view
export const getUserProfile = query({
    args: {
        oderId: v.string(),
    },
    handler: async (ctx, { oderId }) => {
        const currentUserId = await getAuthUserId(ctx);
        if (!currentUserId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", oderId))
            .first();

        if (!profile) return null;

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", oderId))
            .first();

        // Check if I'm supporting them
        const isSupporting = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q.eq("supporterId", currentUserId).eq("supportedId", oderId),
            )
            .first();

        // Check if they're supporting me
        const isSupportingMe = await ctx.db
            .query("supports")
            .withIndex("by_both", q =>
                q.eq("supporterId", oderId).eq("supportedId", currentUserId),
            )
            .first();

        // Get their services if creative
        let services: any[] = [];
        if (creativeProfile) {
            services = await ctx.db
                .query("services")
                .withIndex("by_userId", q => q.eq("userId", oderId))
                .filter(q =>
                    q.and(
                        q.eq(q.field("status"), "ACTIVE"),
                        q.eq(q.field("deleteStatus"), false),
                    ),
                )
                .take(6);
        }

        // Get support counts for this user
        const theirSupporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", oderId))
            .collect();

        const theirSupporting = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", oderId))
            .collect();

        const categories = creativeProfile?.skills
            ? await Promise.all(
                  creativeProfile.skills.map(id => ctx.db.get(id)),
              )
            : [];

        const skillNames =
            categories?.map(cat => cat && cat.name).filter(Boolean) || [];

        return {
            oderId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            email: profile.email,
            businessName: creativeProfile?.businessName,
            bio: creativeProfile?.aboutMe,
            coverImage: creativeProfile?.coverImage,
            skills: skillNames,
            isCreative: !!creativeProfile,
            isSupporting: !!isSupporting,
            isSupportingMe: !!isSupportingMe,
            supportersCount: theirSupporters.length,
            supportingCount: theirSupporting.length,
            services: services.map(s => ({
                id: s._id,
                name: s.name,
                serviceFee: s.serviceFee,
                duration: s.duration,
                banners: s.banners,
            })),
            stats: creativeProfile?.stats,
        };
    },
});

// Get my support counts
export const getMySupportCounts = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { supporters: 0, supporting: 0 };

        const supporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", userId))
            .collect();

        const supporting = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", userId))
            .collect();

        return {
            supporters: supporters.length,
            supporting: supporting.length,
        };
    },
});
