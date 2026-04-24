import { query } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";

function calculateCreativeEarning(
    totalFee: number,
    clientPlatformFee: number,
    creativePlatformFee: number,
) {
    return totalFee - (clientPlatformFee + creativePlatformFee);
}

// Helper to calculate profile completeness
function calculateProfileCompleteness(
    profile: any,
    creativeProfile: any,
): number {
    const checks = [
        !!profile?.firstName,
        !!profile?.lastName,
        !!profile?.avatar,
        !!profile?.phoneNumber,
        !!creativeProfile?.businessName,
        !!creativeProfile?.bio,
        !!creativeProfile?.coverImage,
        !!creativeProfile?.workAddress,
        (creativeProfile?.skills?.length || 0) > 0,
        (creativeProfile?.gallery?.length || 0) > 0,
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
}

// Helper to format time
function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

// Helper to get relative time
function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

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

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        if (!creativeProfile) return null;

        // ==========================================
        // SERVICES
        // ==========================================
        const allServices = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        const activeServices = allServices.filter(s => s.status === "ACTIVE");
        const draftServices = allServices.filter(s => s.status === "DRAFT");

        // ==========================================
        // BOOKINGS
        // ==========================================
        const now = Date.now();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Get start of week (Sunday)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const allBookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .collect();

        // Upcoming bookings (confirmed, today or future)
        const upcomingBookings = allBookings
            .filter(
                b =>
                    (b.status === "CONFIRMED" || b.status === "PENDING") &&
                    b.dateBooked >= startOfToday.getTime(),
            )
            .sort((a, b) => a.dateBooked - b.dateBooked);

        // Today's bookings
        const todayBookings = allBookings.filter(
            b =>
                b.dateBooked >= startOfToday.getTime() &&
                b.dateBooked <= endOfToday.getTime() &&
                b.status !== "CANCELLED",
        );

        // Pending bookings (for badge)
        const pendingBookings = allBookings.filter(b => b.status === "PENDING");

        // Completed bookings this week
        const completedThisWeek = allBookings.filter(
            b =>
                b.status === "COMPLETED" &&
                b.dateBooked >= startOfWeek.getTime(),
        );

        // ==========================================
        // EARNINGS (from completed bookings)
        // ==========================================
        // Today's earnings
        const todayEarnings = allBookings
            .filter(
                b =>
                    b.status === "COMPLETED" &&
                    b.dateBooked >= startOfToday.getTime() &&
                    b.dateBooked <= endOfToday.getTime(),
            )
            .reduce(
                (sum, b) =>
                    sum +
                    calculateCreativeEarning(
                        b.proposedTotal,
                        b.platformClientFeeAmount,
                        b.platformCreativeFeeAmount,
                    ),
                0,
            );

        // This week's earnings (by day)
        const weeklyEarningsMap: Record<number, number> = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
        };

        completedThisWeek.forEach(b => {
            const dayOfWeek = new Date(b.dateBooked).getDay();
            weeklyEarningsMap[dayOfWeek] += calculateCreativeEarning(
                b.proposedTotal,
                b.platformClientFeeAmount,
                b.platformCreativeFeeAmount,
            );
        });

        const weeklyEarnings = [
            { day: "Sun", amount: Math.round(weeklyEarningsMap[0]) },
            { day: "Mon", amount: Math.round(weeklyEarningsMap[1]) },
            { day: "Tue", amount: Math.round(weeklyEarningsMap[2]) },
            { day: "Wed", amount: Math.round(weeklyEarningsMap[3]) },
            { day: "Thu", amount: Math.round(weeklyEarningsMap[4]) },
            { day: "Fri", amount: Math.round(weeklyEarningsMap[5]) },
            { day: "Sat", amount: Math.round(weeklyEarningsMap[6]) },
        ];

        const thisWeekTotal = Object.values(weeklyEarningsMap).reduce(
            (sum, val) => sum + val,
            0,
        );

        // Last week's earnings for comparison
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const lastWeekTotal = allBookings
            .filter(
                b =>
                    b.status === "COMPLETED" &&
                    b.dateBooked >= startOfLastWeek.getTime() &&
                    b.dateBooked < startOfWeek.getTime(),
            )
            .reduce(
                (sum, b) =>
                    sum +
                    calculateCreativeEarning(
                        b.proposedTotal,
                        b.platformClientFeeAmount,
                        b.platformCreativeFeeAmount,
                    ),
                0,
            );

        const earningsPercentChange =
            lastWeekTotal > 0
                ? Math.round(
                      ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100,
                  )
                : thisWeekTotal > 0
                  ? 100
                  : 0;

        // ==========================================
        // ENRICH UPCOMING BOOKINGS WITH CLIENT & SERVICE DATA
        // ==========================================
        const enrichedUpcomingBookings = await Promise.all(
            upcomingBookings.slice(0, 5).map(async booking => {
                const clientProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.clientId),
                    )
                    .first();

                const service = await ctx.db.get(booking.serviceId);

                const bookingDate = new Date(booking.dateBooked);
                const isToday =
                    booking.dateBooked >= startOfToday.getTime() &&
                    booking.dateBooked <= endOfToday.getTime();

                return {
                    id: booking._id,
                    clientName: clientProfile
                        ? `${clientProfile.firstName || ""} ${clientProfile.lastName || ""}`.trim() ||
                          "Client"
                        : "Client",
                    clientAvatar: clientProfile?.avatar,
                    serviceName: service?.name || "Service",
                    date: bookingDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    }),
                    time: formatTime(booking.startTime),
                    isToday,
                    status: booking.status,
                };
            }),
        );

        // ==========================================
        // RECENT ACTIVITY (from notifications)
        // ==========================================
        const recentNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .take(10);

        const recentActivity = recentNotifications.map(notification => {
            // Map notification type to activity type
            let type: "like" | "review" | "follow" | "message" | "booking" =
                "booking";

            if (notification.type === "REVIEW") type = "review";
            else if (notification.type === "SUPPORT") type = "follow";
            else if (notification.type === "MESSAGE") type = "message";
            else if (notification.type === "LIKE") type = "like";
            else if (notification.type === "BOOKING") type = "booking";

            return {
                id: notification._id,
                type,
                title: notification.title,
                subtitle: notification.content,
                time: getRelativeTime(notification._creationTime),
                read: notification.read,
            };
        });

        // ==========================================
        // NOTIFICATIONS COUNT
        // ==========================================
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        // ==========================================
        // STRIPE / PAYMENT SETTINGS
        // ==========================================
        const paymentSettings = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        // ==========================================
        // POSTS COUNT
        // ==========================================
        const posts = await ctx.db
            .query("media")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .collect();

        // ==========================================
        // REVIEWS
        // ==========================================
        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", userId))
            .collect();

        const averageRating =
            reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

        // ==========================================
        // PROFILE VIEWS (if you have analytics table)
        // For now, use a placeholder or skip
        // ==========================================
        const weeklyViews = 0; // TODO: Implement profile view tracking

        // ==========================================
        // RETURN DATA
        // ==========================================
        return {
            // Checklist data
            servicesCount: activeServices.length,
            stripeConnected: paymentSettings?.status === "ACTIVE",
            postsCount: posts.length,
            followingCount: 0, // TODO: Add following count when implemented

            // Stats
            todayEarnings: Math.round(todayEarnings),
            todayBookings: todayBookings.length,
            weeklyViews,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length,

            // Bookings
            upcomingBookings: enrichedUpcomingBookings,
            pendingBookingsCount: pendingBookings.length,

            // Earnings
            weeklyEarnings,
            thisWeekTotal: Math.round(thisWeekTotal),
            earningsPercentChange,

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

            // Profile completeness
            profileCompleteness: calculateProfileCompleteness(
                profile,
                creativeProfile,
            ),
        };
    },
});

// Also export tab badges query
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
