import { query } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";
import { CreativeEarningCalcType } from "@convex/utils/helpers/types";
import {
    isBookingToday,
    utcMidnightToday,
    formatBookingDate,
} from "@convex/utils/time";

function calculateCreativeEarning(
    totalFee: number,
    clientPlatformFee: number,
    creativePlatformFee: number,
) {
    return totalFee - (clientPlatformFee + creativePlatformFee);
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

// ── Header — unread count only ────────────────────────────────────
export const getHeaderData = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { unreadNotifications: 0 };

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        return { unreadNotifications: unread.length };
    },
});

// ── Incomplete tasks — drafts + stripe ───────────────────────────
export const getIncompleteTasks = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId)
            return {
                draftServices: [],
                stripeStatus: "not_started",
                stripeProgress: 0,
            };

        const draftServices = await ctx.db
            .query("services")
            .withIndex("by_user_status", q =>
                q.eq("userId", userId).eq("status", "DRAFT"),
            )
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        const paymentSettings = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        const stripeStatus = !paymentSettings
            ? "not_started"
            : paymentSettings.status === "ACTIVE"
              ? "complete"
              : paymentSettings.stripeAccountId
                ? "incomplete"
                : "not_started";

        return {
            draftServices: draftServices.map(s => ({
                id: s._id,
                name: s.name,
            })),
            stripeStatus,
            stripeProgress: paymentSettings?.stripeAccountId ? 50 : 0,
        };
    },
});

// ── Checklist — 5 completion booleans ────────────────────────────
export const getChecklistStatus = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const activeServices = await ctx.db
            .query("services")
            .withIndex("by_user_status", q =>
                q.eq("userId", userId).eq("status", "ACTIVE"),
            )
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .take(1);

        const paymentSettings = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        const firstPost = await ctx.db
            .query("posts")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .first();

        const firstSupport = await ctx.db
            .query("supports")
            .withIndex("by_supporter", q => q.eq("supporterId", userId))
            .first();

        return {
            profileComplete: creativeProfile?.onboardingComplete ?? false,
            hasService: activeServices.length > 0,
            stripeComplete: paymentSettings?.status === "ACTIVE",
            hasPost: !!firstPost,
            hasSupported: !!firstSupport,
        };
    },
});

// ── Quick stats ───────────────────────────────────────────────────
export const getQuickStats = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const now = Date.now();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const allBookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .collect();

        const earning = (b: CreativeEarningCalcType) =>
            calculateCreativeEarning(
                b.proposedTotal,
                b.platformClientFeeAmount,
                b.platformCreativeFeeAmount,
            );

        const completedToday = allBookings.filter(
            b =>
                b.status === "COMPLETED" &&
                b.dateBooked >= startOfToday.getTime() &&
                b.dateBooked <= endOfToday.getTime(),
        );
        const completedThisWeek = allBookings.filter(
            b =>
                b.status === "COMPLETED" &&
                b.dateBooked >= startOfWeek.getTime(),
        );
        const completedThisMonth = allBookings.filter(
            b =>
                b.status === "COMPLETED" &&
                b.dateBooked >= startOfMonth.getTime(),
        );

        const todayBookings = allBookings.filter(
            b =>
                b.dateBooked >= startOfToday.getTime() &&
                b.dateBooked <= endOfToday.getTime() &&
                b.status !== "CANCELLED",
        );
        const weekBookings = allBookings.filter(
            b =>
                b.dateBooked >= startOfWeek.getTime() &&
                b.status !== "CANCELLED",
        );
        const monthBookings = allBookings.filter(
            b =>
                b.dateBooked >= startOfMonth.getTime() &&
                b.status !== "CANCELLED",
        );

        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", userId))
            .collect();

        const averageRating =
            reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

        return {
            today: {
                earnings: Math.round(
                    completedToday.reduce((s, b) => s + earning(b), 0),
                ),
                bookings: todayBookings.length,
            },
            week: {
                earnings: Math.round(
                    completedThisWeek.reduce((s, b) => s + earning(b), 0),
                ),
                bookings: weekBookings.length,
            },
            month: {
                earnings: Math.round(
                    completedThisMonth.reduce((s, b) => s + earning(b), 0),
                ),
                bookings: monthBookings.length,
            },
            rating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length,
        };
    },
});

// ── Upcoming bookings ─────────────────────────────────────────────
export const getUpcomingBookings = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const upcoming = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q =>
                q.and(
                    q.or(
                        q.eq(q.field("status"), "CONFIRMED"),
                        q.eq(q.field("status"), "PENDING"),
                        q.eq(q.field("status"), "PAID"),
                    ),
                    q.gte(q.field("dateBooked"), utcMidnightToday()),
                ),
            )
            .order("asc")
            .take(5);

        return await Promise.all(
            upcoming.map(async booking => {
                const clientProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.clientId),
                    )
                    .first();

                const service = await ctx.db.get(booking.serviceId);
                const bookingDate = new Date(booking.dateBooked);
                // AFTER — timezone aware
                const isToday = isBookingToday(
                    booking.dateBooked,
                    booking.clientTimezone ?? "UTC",
                );

                return {
                    id: booking._id,
                    clientName: clientProfile
                        ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim() ||
                          "Client"
                        : "Client",
                    clientAvatar: clientProfile?.avatar,
                    serviceName: service?.name ?? "Service",
                    date: formatBookingDate(booking.dateBooked),
                    isToday,
                    status: booking.status,
                    startTime: booking.startTime,
                    dateBooked: booking.dateBooked,
                    clientTimezone: booking.clientTimezone ?? "UTC",
                };
            }),
        );
    },
});

// ── Earnings snapshot — weekly chart ─────────────────────────────
export const getEarningsSnapshot = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const allBookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q =>
                q.or(
                    q.eq(q.field("status"), "COMPLETED"),
                    q.eq(q.field("status"), "PAID"),
                    q.eq(q.field("status"), "DISPUTE"),
                ),
            )
            .collect();

        const earning = (b: CreativeEarningCalcType) =>
            calculateCreativeEarning(
                b.proposedTotal,
                b.platformClientFeeAmount,
                b.platformCreativeFeeAmount,
            );

        const weeklyMap: Record<number, number> = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
        };

        let thisWeekTotal = 0;
        let lastWeekTotal = 0;

        allBookings.forEach(b => {
            if (b.dateBooked >= startOfWeek.getTime()) {
                const day = new Date(b.dateBooked).getDay();
                weeklyMap[day] += earning(b);
                thisWeekTotal += earning(b);
            } else if (b.dateBooked >= startOfLastWeek.getTime()) {
                lastWeekTotal += earning(b);
            }
        });

        const earningsPercentChange =
            lastWeekTotal > 0
                ? Math.round(
                      ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100,
                  )
                : thisWeekTotal > 0
                  ? 100
                  : 0;

        return {
            weeklyEarnings: [
                { day: "Sun", amount: Math.round(weeklyMap[0]) },
                { day: "Mon", amount: Math.round(weeklyMap[1]) },
                { day: "Tue", amount: Math.round(weeklyMap[2]) },
                { day: "Wed", amount: Math.round(weeklyMap[3]) },
                { day: "Thu", amount: Math.round(weeklyMap[4]) },
                { day: "Fri", amount: Math.round(weeklyMap[5]) },
                { day: "Sat", amount: Math.round(weeklyMap[6]) },
            ],
            thisWeekTotal: Math.round(thisWeekTotal),
            earningsPercentChange,
        };
    },
});

// ── Recent activity ───────────────────────────────────────────────
export const getRecentActivity = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .take(10);

        return notifications.map(n => {
            let type: "like" | "review" | "follow" | "message" | "booking" =
                "booking";
            if (n.type === "REVIEW") type = "review";
            else if (n.type === "SUPPORT") type = "follow";
            else if (n.type === "MESSAGE") type = "message";
            else if (n.type === "LIKE") type = "like";

            return {
                id: n._id,
                type,
                title: n.title,
                subtitle: n.content,
                time: getRelativeTime(n._creationTime),
                read: n.read,
            };
        });
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
