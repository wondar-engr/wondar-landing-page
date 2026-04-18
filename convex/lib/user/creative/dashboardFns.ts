import { Doc } from "../../../_generated/dataModel";
import { query } from "../../../_generated/server";
import { getAuthUserId } from "../../..//auth";

export const getTabBadges = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Pending bookings count
        const pendingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("status"), "PENDING"))
            .collect();

        // Unread notifications count
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        // TODO: Unread messages count (when messaging is implemented)
        const unreadMessages = 0;

        return {
            pendingBookings: pendingBookings.length,
            unreadNotifications: unreadNotifications.length,
            unreadMessages,
        };
    },
});

export const getDashboardData = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        if (!profile) return null;

        // Get draft services count
        const draftServices = await ctx.db
            .query("services")
            .withIndex("by_user_status", q =>
                q.eq("userId", userId).eq("status", "DRAFT"),
            )
            .collect();

        // Get creative profile
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        if (!creativeProfile) return null;

        // Get services count
        const services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        // Get upcoming bookings
        const now = Date.now();
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q =>
                q.and(
                    q.gte(q.field("dateBooked"), now),
                    q.neq(q.field("status"), "CANCELLED"),
                ),
            )
            .take(10);

        // Get today's bookings and earnings
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayBookings = bookings.filter(
            b =>
                b.dateBooked >= startOfDay.getTime() &&
                b.dateBooked <= endOfDay.getTime(),
        );

        // Get payment settings
        const paymentSettings = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        console.log("Payment settings:", paymentSettings);
        // Get notifications count
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        // Get posts count (for checklist)
        const posts = await ctx.db
            .query("media")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .collect();

        // Mock weekly earnings data
        const weeklyEarnings = [
            { day: "Sun", amount: 0 },
            { day: "Mon", amount: 120 },
            { day: "Tue", amount: 85 },
            { day: "Wed", amount: 200 },
            { day: "Thu", amount: 150 },
            { day: "Fri", amount: 0 },
            { day: "Sat", amount: 0 },
        ];

        // Mock recent activity
        const recentActivity = [
            {
                id: "1",
                type: "follow" as const,
                title: "@mike_stylist started following you",
                subtitle: "New follower",
                time: "2m ago",
            },
            {
                id: "2",
                type: "review" as const,
                title: "New 5-star review",
                subtitle: "From Jane D.",
                time: "1h ago",
            },
            {
                id: "3",
                type: "like" as const,
                title: "12 likes on your latest post",
                subtitle: "Portfolio update",
                time: "3h ago",
            },
        ];

        return {
            // Checklist data
            servicesCount: services.length,
            stripeConnected: paymentSettings?.status === "ACTIVE",
            postsCount: posts.length,
            followingCount: 0, // TODO: Add following count

            // Stats
            todayEarnings: 120, // TODO: Calculate from payments
            todayBookings: todayBookings.length,
            weeklyViews: 47, // TODO: Track profile views
            averageRating: creativeProfile.stats?.averageRating || 0,
            totalReviews: creativeProfile.stats?.totalReviews || 0,

            // Bookings
            upcomingBookings: bookings.slice(0, 3).map(b => ({
                id: b._id,
                clientName: "Client Name", // TODO: Fetch client details
                clientAvatar: undefined,
                serviceName: "Service", // TODO: Fetch service name
                date: new Date(b.dateBooked).toLocaleDateString(),
                time: `${Math.floor(b.startTime / 60)}:${String(b.startTime % 60).padStart(2, "0")}`,
                isToday:
                    b.dateBooked >= startOfDay.getTime() &&
                    b.dateBooked <= endOfDay.getTime(),
            })),

            // Earnings
            weeklyEarnings,
            thisWeekTotal: 555,
            earningsPercentChange: 12,

            // Activity
            recentActivity,

            // Notifications
            unreadNotifications: unreadNotifications.length,

            // Draft services
            draftServices: draftServices.map(s => ({
                id: s._id,
                name: s.name,
            })),

            // Stripe status
            stripeStatus: !paymentSettings
                ? "not_started"
                : paymentSettings?.status === "ACTIVE"
                  ? "complete"
                  : paymentSettings?.stripeAccountId
                    ? "incomplete"
                    : "not_started",
            stripeProgress: paymentSettings?.stripeAccountId ? 50 : 0,

            // Profile completeness (calculate based on filled fields)
            profileCompleteness: calculateProfileCompleteness(
                profile,
                creativeProfile,
            ),
        };
    },
});

// Helper function
function calculateProfileCompleteness(
    profile: Doc<"profiles">,
    creativeProfile: Doc<"creativeProfiles">,
): number {
    let score = 0;
    const total = 10;

    if (profile?.firstName) score++;
    if (profile?.lastName) score++;
    if (profile?.avatar) score++;
    if (profile?.phoneNumber) score++;
    if (creativeProfile?.businessName) score++;
    if (creativeProfile?.aboutMe) score++;
    if (creativeProfile?.coverImage) score++;
    if (creativeProfile?.workAddress) score++;
    if (creativeProfile?.skills && creativeProfile?.skills?.length > 0) score++;
    if (creativeProfile?.onboardingComplete) score++;

    return Math.round((score / total) * 100);
}
