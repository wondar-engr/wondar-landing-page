import { query, mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../../convex/auth";

// Check if user has favorited a service
export const isFavorited = query({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, { serviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return false;

        const favorite = await ctx.db
            .query("favorites")
            .withIndex("by_both", q =>
                q.eq("userId", userId).eq("serviceId", serviceId),
            )
            .first();

        return !!favorite;
    },
});

// Toggle favorite
export const toggleFavorite = mutation({
    args: {
        serviceId: v.id("services"),
    },
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
            return { isFavorited: false };
        } else {
            await ctx.db.insert("favorites", {
                userId,
                serviceId,
                createdAt: Date.now(),
            });
            return { isFavorited: true };
        }
    },
});

// Get all favorite services for current user
export const getMyFavorites = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 50 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const favorites = await ctx.db
            .query("favorites")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        // Enrich with service and creative data
        const enrichedFavorites = await Promise.all(
            favorites.map(async fav => {
                const service = await ctx.db.get(fav.serviceId);
                if (!service || service.deleteStatus) return null;

                const creativeProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .first();

                const creative = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .first();

                const category = await ctx.db.get(service.categoryId);

                return {
                    id: fav._id,
                    favoritedAt: fav.createdAt,
                    service: {
                        id: service._id,
                        name: service.name,
                        description: service.description,
                        serviceFee: service.serviceFee,
                        duration: service.duration,
                        banners: service.banners,
                        category,
                    },
                    creative: {
                        userId: service.userId,
                        firstName: creativeProfile?.firstName,
                        lastName: creativeProfile?.lastName,
                        avatar: creativeProfile?.avatar,
                        businessName: creative?.businessName,
                        stats: creative?.stats,
                    },
                };
            }),
        );

        // Filter out null (deleted services)
        return enrichedFavorites.filter(Boolean);
    },
});

// Get favorites count
export const getFavoritesCount = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;

        const favorites = await ctx.db
            .query("favorites")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .collect();

        return favorites.length;
    },
});
