import { query, QueryCtx } from "../../../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "../../../auth";
import { Id } from "../../../_generated/dataModel";

// ── Shared type returned by both functions ────────────────────────
export type DiscoverCreativeResult = {
    userId: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    businessName: string;
    coverImage: string;
    skills: string[];
    rating: number;
    reviewCount: number;
    completedBookings: number;
    supporterCount: number;
    thumbnails: string[];
    iSupport: boolean;
    theySupportMe: boolean;
    mutualSupport: boolean;
    sharedCategories: number;
    score: number;
};

// ── Shared enrichment helper ──────────────────────────────────────
async function enrichCreative(
    ctx: QueryCtx,
    creativeUserId: string,
    viewerId: string,
    myCategoryIds: Id<"serviceCategories">[],
    score: number,
): Promise<DiscoverCreativeResult | null> {
    // Basic profile
    const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", creativeUserId))
        .first();

    if (!profile) return null;

    const creativeProfile = await ctx.db
        .query("creativeProfiles")
        .withIndex("by_userId", q => q.eq("userId", creativeUserId))
        .first();

    if (!creativeProfile) return null;

    // Support status
    const iSupport = await ctx.db
        .query("supports")
        .withIndex("by_both", q =>
            q.eq("supporterId", viewerId).eq("supportedId", creativeUserId),
        )
        .first();

    const theySupportMe = await ctx.db
        .query("supports")
        .withIndex("by_both", q =>
            q.eq("supporterId", creativeUserId).eq("supportedId", viewerId),
        )
        .first();

    // Supporter count
    const allSupporters = await ctx.db
        .query("supports")
        .withIndex("by_supported", q => q.eq("supportedId", creativeUserId))
        .collect();

    // Shared categories
    const theirServices = await ctx.db
        .query("services")
        .withIndex("by_userId", q => q.eq("userId", creativeUserId))
        .filter(q => q.eq(q.field("deleteStatus"), false))
        .collect();

    const theirCategoryIds = theirServices.map(s => s.categoryId);
    const sharedCategories = myCategoryIds.filter(id =>
        theirCategoryIds.includes(id),
    ).length;

    // Post thumbnails (3 most recent)
    const posts = await ctx.db
        .query("posts")
        .withIndex("by_creative", q => q.eq("creativeId", creativeUserId))
        .filter(q => q.eq(q.field("visibility"), "PUBLIC"))
        .order("desc")
        .take(3);

    const thumbnails = posts
        .map(p => p.media?.[0]?.url)
        .filter(Boolean) as string[];

    const skillNames = await Promise.all(
        (creativeProfile.skills ?? []).map(skillId =>
            ctx.db
                .query("serviceCategories")
                .withIndex("by_id", q => q.eq("_id", skillId))
                .first()
                .then(cat => cat?.name ?? ""),
        ),
    );

    return {
        userId: creativeUserId,
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        avatar: profile.avatar,
        businessName: creativeProfile.businessName ?? "",
        coverImage: creativeProfile.coverImage ?? "",
        skills: skillNames,
        rating: creativeProfile.stats?.averageRating ?? 0,
        reviewCount: creativeProfile.stats?.totalReviews ?? 0,
        completedBookings: creativeProfile.stats?.completedBookings ?? 0,
        supporterCount: allSupporters.length,
        thumbnails,
        iSupport: !!iSupport,
        theySupportMe: !!theySupportMe,
        mutualSupport: !!iSupport && !!theySupportMe,
        sharedCategories,
        score,
    };
}

// ── Get viewer's own category IDs helper ─────────────────────────
async function getMyCategories(
    ctx: QueryCtx,
    userId: string,
): Promise<Id<"serviceCategories">[]> {
    const myServices = await ctx.db
        .query("services")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .filter(q => q.eq(q.field("deleteStatus"), false))
        .collect();

    return [...new Set(myServices.map(s => s.categoryId).filter(Boolean))];
}

// ── Universal search ──────────────────────────────────────────────
export const searchCreatives = query({
    args: {
        query: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { query: rawQuery, paginationOpts }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { page: [], isDone: true, continueCursor: "" };

        const term = rawQuery.trim().toLowerCase();
        if (!term) return { page: [], isDone: true, continueCursor: "" };

        const myCategoryIds = await getMyCategories(ctx, userId);

        // Get all complete creative profiles excluding self
        const allCreativeProfiles = await ctx.db
            .query("creativeProfiles")
            .filter(q => q.eq(q.field("onboardingComplete"), true))
            .collect();

        const candidates = allCreativeProfiles.filter(c => c.userId !== userId);

        // Score each candidate against the search term
        const scored: DiscoverCreativeResult[] = [];

        for (const creative of candidates) {
            const profile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creative.userId))
                .first();

            if (!profile) continue;

            const fullName =
                `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.toLowerCase();
            const business = (creative.businessName ?? "").toLowerCase();
            const skills = (creative.skills ?? []).join(" ").toLowerCase();
            const about = (creative.aboutMe ?? "").toLowerCase();

            // Score by match quality
            let score = 0;
            if (fullName.startsWith(term)) score += 20;
            else if (fullName.includes(term)) score += 10;
            if (business.startsWith(term)) score += 16;
            else if (business.includes(term)) score += 8;
            if (skills.includes(term)) score += 6;
            if (about.includes(term)) score += 2;

            // Also search service names
            const theirServices = await ctx.db
                .query("services")
                .withIndex("by_userId", q => q.eq("userId", creative.userId))
                .collect();

            const serviceMatch = theirServices.some(s =>
                s.name?.toLowerCase().includes(term),
            );
            if (serviceMatch) score += 5;

            if (score === 0) continue;

            // Boost by rating
            score += (creative.stats?.averageRating ?? 0) * 2;

            const enriched = await enrichCreative(
                ctx,
                creative.userId,
                userId,
                myCategoryIds,
                score,
            );

            if (enriched) scored.push(enriched);
        }

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Manual pagination
        const numItems = paginationOpts.numItems ?? 20;
        const startIndex = paginationOpts.cursor
            ? scored.findIndex(r => r.userId === paginationOpts.cursor) + 1
            : 0;

        const page = scored.slice(startIndex, startIndex + numItems);
        const isDone = startIndex + numItems >= scored.length;
        const continueCursor = isDone
            ? ""
            : (page[page.length - 1]?.userId ?? "");

        return { page, isDone, continueCursor };
    },
});

// ── Recommended creatives ─────────────────────────────────────────
export const getRecommendedCreatives = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const myCategoryIds = await getMyCategories(ctx, userId);

        // Who I already support — exclude from recommendations
        const iAlreadySupport = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", userId))
            .collect();

        const alreadySupportedIds = new Set(
            iAlreadySupport.map(s => s.supportedId),
        );

        // Mutual connection IDs — people my supported ones also support
        const mutualConnectionIds = new Set<string>();
        for (const support of iAlreadySupport) {
            const theySupport = await ctx.db
                .query("supports")
                .withIndex("by_supporter", q =>
                    q.eq("supporterId", support.supportedId),
                )
                .collect();
            theySupport.forEach(s => {
                if (s.supportedId !== userId) {
                    mutualConnectionIds.add(s.supportedId);
                }
            });
        }

        // All complete creatives excluding self + already supporting
        const allCreativeProfiles = await ctx.db
            .query("creativeProfiles")
            .filter(q => q.eq(q.field("onboardingComplete"), true))
            .collect();

        const candidates = allCreativeProfiles.filter(
            c => c.userId !== userId && !alreadySupportedIds.has(c.userId),
        );

        const results: DiscoverCreativeResult[] = [];

        for (const creative of candidates) {
            // Score
            let score = 0;

            // Shared categories — strongest signal
            const theirServices = await ctx.db
                .query("services")
                .withIndex("by_userId", q => q.eq("userId", creative.userId))
                .filter(q => q.eq(q.field("deleteStatus"), false))
                .collect();

            const theirCategoryIds = theirServices.map(s => s.categoryId);
            const sharedCount = myCategoryIds.filter(id =>
                theirCategoryIds.includes(id),
            ).length;

            score += sharedCount * 15;

            // High rating
            score += (creative.stats?.averageRating ?? 0) * 3;

            // Active creative (completed bookings)
            score += Math.min(creative.stats?.completedBookings ?? 0, 20);

            // Mutual connection
            if (mutualConnectionIds.has(creative.userId)) score += 10;

            // Has posts (shows they're active)
            const postCount = await ctx.db
                .query("posts")
                .withIndex("by_creative", q =>
                    q.eq("creativeId", creative.userId),
                )
                .collect();
            if (postCount.length > 0) score += 5;

            const enriched = await enrichCreative(
                ctx,
                creative.userId,
                userId,
                myCategoryIds,
                score,
            );

            if (enriched) results.push(enriched);
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 20);
    },
});
