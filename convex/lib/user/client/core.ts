import { query } from "../../../_generated/server";
import { getAuthUserId } from "@convex/auth";

export const getClientDrawerData = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get user profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!profile) return null;

        // ==========================================
        // Check if user has creative profile
        // ==========================================
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        // ==========================================
        // Get bookings
        // ==========================================
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", userId))
            .collect();

        const completedBookings = bookings.filter(
            b => b.status === "COMPLETED",
        ).length;

        const pendingBookings = bookings.filter(
            b => b.status === "PENDING" || b.status === "CONFIRMED",
        ).length;

        // ==========================================
        // Get reviews given by this user
        // ==========================================
        const reviewsGiven = await ctx.db
            .query("reviews")
            .filter(q => q.eq(q.field("authorId"), userId))
            .collect();

        // ==========================================
        // Get favorite services count
        // ==========================================
        const favorites = await ctx.db
            .query("favorites")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .collect();

        // ==========================================
        // Get unread notifications count
        // ==========================================
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        // ==========================================
        // Get unread messages count
        // TODO: Update when messaging is implemented
        // ==========================================
        const unreadMessages = 0;

        return {
            // User info
            user: {
                userId,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                avatar: profile.avatar,
                userType: profile.currentType,
            },

            // Creative profile check
            hasCreativeProfile: !!creativeProfile,
            creativeOnboardingComplete:
                creativeProfile?.onboardingComplete || false,

            // Stats for header
            stats: {
                totalBookings: bookings.length,
                completedBookings,
                reviewsGiven: reviewsGiven.length,
                favoritesCount: favorites.length,
            },

            // Badges for menu items
            badges: {
                notifications: unreadNotifications.length,
                messages: unreadMessages,
                bookings: pendingBookings,
            },
        };
    },
});
