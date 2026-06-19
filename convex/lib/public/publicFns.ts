import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getPublicCreativeProfile = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const [profile, creativeProfile] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .first(),
            ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .first(),
        ]);

        if (!profile || !creativeProfile) return null;
        if (creativeProfile.accountStatus !== "ACTIVE") return null;

        // Services
        const services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("status"), "ACTIVE"))
            .take(6);

        return {
            userId,
            firstName: profile.firstName!,
            lastName: profile.lastName!,
            avatar: profile.avatar,
            businessName: creativeProfile.businessName,
            aboutMe: creativeProfile.aboutMe,
            coverImage: creativeProfile.coverImage,
            location: {
                city: creativeProfile.workAddress.city,
                state: creativeProfile.workAddress.state,
            },
            stats: creativeProfile.stats,
            services: services.map(s => ({
                id: s._id,
                name: s.name,
                price: s.serviceFee,
                duration: s.duration,
                image: s.banners[0],
            })),
        };
    },
});
