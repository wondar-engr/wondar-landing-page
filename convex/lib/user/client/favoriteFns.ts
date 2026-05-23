import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";

export const toggleFavorite = mutation({
    args: { serviceId: v.id("services") },
    handler: async (ctx, { serviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_both", q =>
                q.eq("userId", userId).eq("serviceId", serviceId),
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { favorited: false };
        } else {
            await ctx.db.insert("favorites", {
                userId,
                serviceId,
                createdAt: Date.now(),
            });
            return { favorited: true };
        }
    },
});

export const getMyFavorites = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const favs = await ctx.db
            .query("favorites")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .collect();

        const enriched = await Promise.all(
            favs.map(async fav => {
                const service = await ctx.db.get(fav.serviceId);
                if (!service || service.deleteStatus) return null;

                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .first();

                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .first();

                return {
                    favoriteId: fav._id,
                    serviceId: fav.serviceId,
                    createdAt: fav.createdAt,
                    service: {
                        name: service.name,
                        serviceFee: service.serviceFee,
                        banners: service.banners,
                        duration: service.duration,
                        paymentSystem: service.paymentSystem,
                    },
                    creative: {
                        userId: service.userId,
                        firstName: profile?.firstName ?? "",
                        lastName: profile?.lastName ?? "",
                        avatar: profile?.avatar,
                        businessName: creativeProfile?.businessName,
                        averageRating:
                            creativeProfile?.stats?.averageRating ?? 0,
                        totalReviews: creativeProfile?.stats?.totalReviews ?? 0,
                    },
                };
            }),
        );

        return enriched.filter(Boolean);
    },
});

export const isFavorited = query({
    args: { serviceId: v.id("services") },
    handler: async (ctx, { serviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return false;

        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_both", q =>
                q.eq("userId", userId).eq("serviceId", serviceId),
            )
            .first();

        return !!existing;
    },
});
