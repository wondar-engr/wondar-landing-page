import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { getSkillNames } from "@convex/utils/helpers/creative";

// ── Header ────────────────────────────────────────────────────────
export const getPortfolioHeader = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!profile || !creativeProfile) return null;

        const skillNames = await getSkillNames(
            ctx,
            creativeProfile.skills ?? [],
        );

        return {
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            avatar: profile.avatar,
            coverImage: creativeProfile.coverImage,
            businessName: creativeProfile.businessName,
            skills: skillNames,
            city: creativeProfile.workAddress.city,
            state: creativeProfile.workAddress.state,
        };
    },
});

// ── Stats + support status ────────────────────────────────────────
export const getPortfolioStats = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const viewerId = await getAuthUserId(ctx);

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const allSupporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", userId))
            .collect();

        const allFollowing = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", userId))
            .collect();

        const iSupport = viewerId
            ? await ctx.db
                  .query("supports")
                  .withIndex("by_both", q =>
                      q.eq("supporterId", viewerId).eq("supportedId", userId),
                  )
                  .first()
            : null;

        const theySupportMe = viewerId
            ? await ctx.db
                  .query("supports")
                  .withIndex("by_both", q =>
                      q.eq("supporterId", userId).eq("supportedId", viewerId),
                  )
                  .first()
            : null;

        return {
            supporterCount: allSupporters.length,
            followingCount: allFollowing.length,
            completedBookings: creativeProfile?.stats?.completedBookings ?? 0,
            averageRating: creativeProfile?.stats?.averageRating ?? 0,
            totalReviews: creativeProfile?.stats?.totalReviews ?? 0,
            iSupport: !!iSupport,
            mutualSupport: !!iSupport && !!theySupportMe,
            isOwnProfile: viewerId === userId,
        };
    },
});

// ── Work tab — posts only ─────────────────────────────────────────
export const getPortfolioPosts = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit = 20 }) => {
        const posts = await ctx.db
            .query("posts")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("visibility"), "PUBLIC"))
            .order("desc")
            .take(limit);

        return posts.map(p => ({
            id: p._id,
            media: p.media, // { url, type }[]
            caption: p.caption,
            likes: p.stats.likes,
            createdAt: p.createdAt,
        }));
    },
});

// ── About tab — bio + stats ───────────────────────────────────────
export const getPortfolioAbout = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!creativeProfile || !profile) return null;

        const skillNames = await getSkillNames(
            ctx,
            creativeProfile.skills ?? [],
        );

        return {
            aboutMe: creativeProfile.aboutMe,
            skills: skillNames,
            city: creativeProfile.workAddress.city,
            state: creativeProfile.workAddress.state,
            willingToTravel: creativeProfile.willingToTravel ?? false,
            travelRadius: creativeProfile.travelRadius,
            memberSince: profile._creationTime,
            stats: {
                completedBookings:
                    creativeProfile.stats?.completedBookings ?? 0,
                averageRating: creativeProfile.stats?.averageRating ?? 0,
                totalReviews: creativeProfile.stats?.totalReviews ?? 0,
                totalBookings: creativeProfile.stats?.totalBookings ?? 0,
            },
        };
    },
});

// ── About tab — reviews preview (latest 2) ────────────────────────
export const getPortfolioReviewsPreview = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", userId))
            .order("desc")
            .take(2);

        return await Promise.all(
            reviews.map(async r => {
                const reviewer = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", r.authorId))
                    .first();

                return {
                    id: r._id,
                    rating: r.rating,
                    content: r.content,
                    role: r.role,
                    reviewer: {
                        firstName: reviewer?.firstName ?? "",
                        lastName: reviewer?.lastName ?? "",
                        avatar: reviewer?.avatar,
                    },
                };
            }),
        );
    },
});

// ── Services tab — active services only ──────────────────────────
export const getPortfolioServices = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const services = await ctx.db
            .query("services")
            .withIndex("by_user_status", q =>
                q.eq("userId", userId).eq("status", "ACTIVE"),
            )
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        return services.map(s => ({
            id: s._id,
            name: s.name,
            description: s.description,
            categoryId: s.categoryId,
            serviceFee: s.serviceFee,
            bookingFee: s.bookingFee,
            banners: s.banners, // first one used as cover
            duration: s.duration, // in minutes
            paymentSystem: s.paymentSystem,
            travelOption: s.travelOption,
            travelFee: s.travelFee,
            stats: s.stats,
        }));
    },
});
