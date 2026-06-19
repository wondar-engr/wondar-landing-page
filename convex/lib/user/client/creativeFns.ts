import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";
import {
    calculateDistance,
    getBoundingBox,
    THIRTY_DAYS_MS,
} from "../../../utils/helpers";
import { v } from "convex/values";

// ==========================================
// GET SINGLE CREATIVE PROFILE
// ==========================================

export const getCreativeProfile = query({
    args: {
        creativeUserId: v.string(),
    },
    handler: async (ctx, { creativeUserId }) => {
        // Get base profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", creativeUserId))
            .first();

        if (!profile) return null;

        // Get creative profile
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", creativeUserId))
            .first();

        if (!creativeProfile) return null;

        // Get skills/categories
        const skills = await Promise.all(
            creativeProfile.skills?.map(async skillId => {
                const category = await ctx.db.get(skillId);
                return category ? { id: skillId, name: category.name } : null;
            }) || [],
        );

        return {
            profile: {
                id: profile.userId,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                avatar: profile.avatar,
                lastSeen: profile.lastSeen,
            },
            creativeProfile: {
                ...creativeProfile,
                skills: skills.filter(Boolean),
            },
        };
    },
});

// ==========================================
// GET CREATIVE'S SERVICES
// ==========================================

export const getCreativeServices = query({
    args: {
        creativeUserId: v.string(),
        limit: v.optional(v.number()),
        categoryId: v.optional(v.id("serviceCategories")),
    },
    handler: async (ctx, { creativeUserId, limit = 10, categoryId }) => {
        let services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", creativeUserId))
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "ACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .take(limit * 2);

        // Filter by category if provided
        if (categoryId) {
            services = services.filter(s => s.categoryId === categoryId);
        }

        // Get category names for each service
        const servicesWithCategory = await Promise.all(
            services.slice(0, limit).map(async service => {
                const category = await ctx.db.get(service.categoryId);

                return {
                    ...service,
                    categoryName: category?.name || "Uncategorized",
                };
            }),
        );

        return servicesWithCategory;
    },
});

// ==========================================
// GET NEARBY CREATIVES (existing)
// ==========================================

export const getNearbyCreatives = query({
    args: {
        lat: v.number(),
        lng: v.number(),
        radiusInMiles: v.number(),
        limit: v.optional(v.number()),
        categoryId: v.optional(v.id("serviceCategories")),
        minRating: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
    },
    handler: async (
        ctx,
        {
            lat,
            lng,
            radiusInMiles,
            limit = 20,
            categoryId,
            minRating,
            maxPrice,
        },
    ) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const bounds = getBoundingBox(lat, lng, radiusInMiles);

        const creativeProfiles = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_location")
            .filter(q =>
                q.and(
                    q.eq(q.field("accountStatus"), "ACTIVE"),
                    q.gte(q.field("workAddress.lat"), bounds.minLat),
                    q.lte(q.field("workAddress.lat"), bounds.maxLat),
                    q.neq(q.field("userId"), userId),
                ),
            )
            .take(limit * 3);

        const results = await Promise.all(
            creativeProfiles.map(async creative => {
                const distance = calculateDistance(
                    lat,
                    lng,
                    creative.workAddress.lat,
                    creative.workAddress.lng,
                );

                if (distance > radiusInMiles) return null;

                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .unique();

                if (!profile) return null;

                let services = await ctx.db
                    .query("services")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .filter(q =>
                        q.and(
                            q.eq(q.field("status"), "ACTIVE"),
                            q.eq(q.field("deleteStatus"), false),
                        ),
                    )
                    .collect();

                if (categoryId) {
                    services = services.filter(
                        s => s.categoryId === categoryId,
                    );
                    if (services.length === 0) return null;
                }
                if (services.length === 0) return null;

                const startingPrice = Math.min(
                    ...services.map(s => s.serviceFee),
                );

                // add filter after startingPrice is calculated:
                if (maxPrice && startingPrice > maxPrice) return null;

                // ✅ Live rating — same as getPopularCreatives
                const reviews = await ctx.db
                    .query("reviews")
                    .withIndex("by_target", q =>
                        q.eq("targetId", creative.userId),
                    )
                    .collect();

                const rating =
                    reviews.length > 0
                        ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        : 0;

                // Min rating filter
                if (minRating && rating < minRating) return null;

                const skills = await Promise.all(
                    creative.skills?.map(async skillId => {
                        const category = await ctx.db.get(skillId);
                        return category?.name || "Creative";
                    }) || [],
                );

                return {
                    id: creative.userId,
                    firstName: profile.firstName || "",
                    lastName: profile.lastName || "",
                    avatar: profile.avatar,
                    coverImage: creative.coverImage,
                    businessName: creative.businessName || "",
                    skill: skills[0] || "",
                    distance,
                    rating,
                    reviewCount: reviews.length,
                    startingPrice,
                    isNew: creative._creationTime > Date.now() - THIRTY_DAYS_MS,
                    isAvailableToday: false,
                    lat: creative.workAddress.lat,
                    lng: creative.workAddress.lng,
                };
            }),
        );

        return results
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
    },
});

// ==========================================
// GET POPULAR CREATIVES (existing)
// ==========================================

export const getPopularCreatives = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 20 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const creativeProfiles = await ctx.db
            .query("creativeProfiles")
            .filter(q =>
                q.and(
                    q.eq(q.field("accountStatus"), "ACTIVE"),
                    q.neq(q.field("userId"), userId),
                ),
            )
            .collect();

        const creativesWithStats = await Promise.all(
            creativeProfiles.map(async creative => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .unique();

                if (!profile) return null;

                const bookings = await ctx.db
                    .query("bookings")
                    .withIndex("by_creative", q =>
                        q.eq("creativeId", creative.userId),
                    )
                    .filter(q => q.eq(q.field("status"), "COMPLETED"))
                    .collect();

                const reviews = await ctx.db
                    .query("reviews")
                    .withIndex("by_target", q =>
                        q.eq("targetId", creative.userId),
                    )
                    .collect();

                const rating =
                    reviews.length > 0
                        ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        : 0;

                const services = await ctx.db
                    .query("services")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .filter(q =>
                        q.and(
                            q.eq(q.field("status"), "ACTIVE"),
                            q.eq(q.field("deleteStatus"), false),
                        ),
                    )
                    .collect();

                const startingPrice =
                    services.length > 0
                        ? Math.min(...services.map(s => s.serviceFee))
                        : undefined;

                const categoryId = creative.skills?.[0];
                const category = categoryId
                    ? await ctx.db.get(categoryId)
                    : null;

                return {
                    id: creative.userId,
                    firstName: profile.firstName || "",
                    lastName: profile.lastName || "",
                    avatar: profile.avatar,
                    coverImage: creative.coverImage,
                    businessName: creative.businessName,
                    skill: category?.name || "Creative",
                    rating,
                    reviewCount: reviews.length,
                    startingPrice,
                    completedBookings: bookings.length,
                };
            }),
        );

        const popularCreatives = creativesWithStats
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .sort((a, b) => b.completedBookings - a.completedBookings)
            .slice(0, limit);

        return popularCreatives;
    },
});

// ==========================================
// GET NEW CREATIVES (existing)
// ==========================================

export const getNewCreatives = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 20 }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const creativeProfiles = await ctx.db
            .query("creativeProfiles")
            .filter(q =>
                q.and(
                    q.eq(q.field("accountStatus"), "ACTIVE"),
                    q.neq(q.field("userId"), userId),
                ),
            )
            .order("desc")
            .take(limit * 2);

        const newCreatives = await Promise.all(
            creativeProfiles.map(async creative => {
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .unique();

                if (!profile) return null;

                const reviews = await ctx.db
                    .query("reviews")
                    .withIndex("by_target", q =>
                        q.eq("targetId", creative.userId),
                    )
                    .collect();

                const rating =
                    reviews.length > 0
                        ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        : 0;

                const services = await ctx.db
                    .query("services")
                    .withIndex("by_userId", q =>
                        q.eq("userId", creative.userId),
                    )
                    .filter(q =>
                        q.and(
                            q.eq(q.field("status"), "ACTIVE"),
                            q.eq(q.field("deleteStatus"), false),
                        ),
                    )
                    .collect();

                const startingPrice =
                    services.length > 0
                        ? Math.min(...services.map(s => s.serviceFee))
                        : undefined;

                const categoryId = creative.skills?.[0];
                const category = categoryId
                    ? await ctx.db.get(categoryId)
                    : null;

                return {
                    id: creative.userId,
                    firstName: profile.firstName || "",
                    lastName: profile.lastName || "",
                    avatar: profile.avatar,
                    coverImage: creative.coverImage,
                    businessName: creative.businessName,
                    skill: category?.name || "Creative",
                    rating,
                    reviewCount: reviews.length,
                    startingPrice,
                    isNew: true,
                };
            }),
        );

        return newCreatives
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .slice(0, limit);
    },
});

export const getCreativePostsFeed = query({
    args: {
        creativeId: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { creativeId, paginationOpts }) => {
        const viewerId = await getAuthUserId(ctx);

        const result = await ctx.db
            .query("posts")
            .withIndex("by_creative", q => q.eq("creativeId", creativeId))
            .filter(q => q.eq(q.field("visibility"), "PUBLIC"))
            .order("desc")
            .paginate(paginationOpts);

        const enriched = await Promise.all(
            result.page.map(async post => {
                // Like count
                const likes = await ctx.db
                    .query("postLikes")
                    .withIndex("by_postId", q => q.eq("postId", post._id))
                    .collect();

                const likedByMe = viewerId
                    ? likes.some(l => l.userId === viewerId)
                    : false;

                // Tagged service
                let service = null;
                if (post.serviceId) {
                    const s = await ctx.db.get(post.serviceId);
                    if (s) service = { _id: s._id, name: s.name };
                }

                return {
                    ...post,
                    likeCount: likes.length,
                    likedByMe,
                    service,
                };
            }),
        );

        return { ...result, page: enriched };
    },
});

export const likePost = mutation({
    args: { postId: v.id("posts") },
    handler: async (ctx, { postId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("postLikes")
            .withIndex("by_user_post", q =>
                q.eq("userId", userId).eq("postId", postId),
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            // Decrement stats
            const post = await ctx.db.get(postId);
            if (post) {
                await ctx.db.patch(postId, {
                    stats: {
                        ...post.stats,
                        likes: Math.max(0, (post.stats?.likes ?? 1) - 1),
                    },
                });
            }
            return { liked: false };
        } else {
            await ctx.db.insert("postLikes", {
                postId,
                userId,
                createdAt: Date.now(),
            });
            const post = await ctx.db.get(postId);
            if (post) {
                await ctx.db.patch(postId, {
                    stats: {
                        ...post.stats,
                        likes: (post.stats?.likes ?? 0) + 1,
                    },
                });
            }
            return { liked: true };
        }
    },
});

export const getCreativeReviews = query({
    args: {
        paginationOpts: paginationOptsValidator,
        creativeUserId: v.string(),
    },
    handler: async (ctx, { paginationOpts, creativeUserId }) => {
        const result = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", creativeUserId)) // ← was by_creativeId
            .order("desc")
            .paginate(paginationOpts);

        const enriched = await Promise.all(
            result.page.map(async review => {
                const clientProfile = await ctx.db
                    .query("profiles")
                    .withIndex(
                        "by_userId",
                        q => q.eq("userId", review.authorId), // ← was clientId
                    )
                    .first();

                return {
                    ...review,
                    clientName: clientProfile
                        ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
                        : "Anonymous",
                    clientAvatar: clientProfile?.avatar ?? null,
                    // no serviceId on review — omit serviceName
                };
            }),
        );

        return { ...result, page: enriched };
    },
});
