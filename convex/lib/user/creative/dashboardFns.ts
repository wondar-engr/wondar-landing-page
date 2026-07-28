import { query } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";
import { CreativeEarningCalcType } from "@convex/utils/helpers/types";
import {
    isBookingToday,
    utcMidnightToday,
    formatBookingDate,
    bookingStartToUtcMs,
    localStartOfDay,
    localStartOfWeek,
    localStartOfMonth,
    getDayInZone,
} from "@convex/utils/time";
import { v } from "convex/values";

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
    args: {
        timezone: v.string(), // IANA timezone from device
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // ── Time boundaries in creative's local timezone ──────────
        const now = Date.now();

        const startOfToday = localStartOfDay(args.timezone);
        const startOfWeek = localStartOfWeek(args.timezone);
        const startOfMonth = localStartOfMonth(args.timezone);

        const [transactions, allBookings, reviews] = await Promise.all([
            ctx.db
                .query("transactions")
                .withIndex("by_creativeId", q => q.eq("creativeId", userId))
                .filter(q => q.eq(q.field("status"), "SUCCEEDED"))
                .collect(),
            ctx.db
                .query("bookings")
                .withIndex("by_creative", q => q.eq("creativeId", userId))
                .collect(),
            ctx.db
                .query("reviews")
                .withIndex("by_target", q => q.eq("targetId", userId))
                .collect(),
        ]);

        const earnedAfter = (cutoff: number) =>
            transactions
                .filter(t => (t.completedAt ?? t._creationTime) >= cutoff)
                .reduce((sum, t) => sum + t.creativeEarnings, 0);

        const countAfter = (cutoff: number) =>
            allBookings.filter(
                b =>
                    b._creationTime >= cutoff &&
                    b.status !== "CANCELLED" &&
                    b.status !== "REFUNDED",
            ).length;

        const averageRating =
            reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

        return {
            today: {
                earnings: earnedAfter(startOfToday),
                bookings: countAfter(startOfToday),
            },
            week: {
                earnings: earnedAfter(startOfWeek),
                bookings: countAfter(startOfWeek),
            },
            month: {
                earnings: earnedAfter(startOfMonth),
                bookings: countAfter(startOfMonth),
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
    args: {
        timezone: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const now = Date.now();
        const startOfThisWeek = localStartOfWeek(args.timezone);
        const startOfLastWeek = startOfThisWeek - 7 * 24 * 60 * 60 * 1000;

        // ── Pull from transactions — already net of platform fee ──
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_creativeId", q => q.eq("creativeId", userId))
            .filter(q => q.eq(q.field("status"), "SUCCEEDED"))
            .collect();

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

        transactions.forEach(t => {
            const ts = t.completedAt ?? t._creationTime;

            if (ts >= startOfThisWeek) {
                const day = getDayInZone(ts, args.timezone);
                weeklyMap[day] += t.creativeEarnings;
                thisWeekTotal += t.creativeEarnings;
            } else if (ts >= startOfLastWeek) {
                lastWeekTotal += t.creativeEarnings;
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

// ── Urgent bookings — pending, in-progress, dispute, paid today ───
export const getUrgentBookings = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", userId))
            .filter(q =>
                q.or(
                    q.eq(q.field("status"), "PENDING"),
                    q.eq(q.field("status"), "IN_PROGRESS"),
                    q.eq(q.field("status"), "DISPUTE"),
                    q.eq(q.field("status"), "PAID"),
                    q.eq(q.field("status"), "COMPLETED"),
                ),
            )
            .order("asc")
            .collect();

        const enriched = await Promise.all(
            bookings.map(async b => {
                const [clientProfile, service] = await Promise.all([
                    ctx.db
                        .query("profiles")
                        .withIndex("by_userId", q => q.eq("userId", b.clientId))
                        .first(),
                    ctx.db.get(b.serviceId),
                ]);

                const clientName = clientProfile
                    ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim() ||
                      "Client"
                    : "Client";

                // ── Dispute state resolution ──────────────────────
                let disputeState:
                    | "submit_statement"
                    | "awaiting_client"
                    | "awaiting_resolution"
                    | null = null;

                if (b.status === "DISPUTE" && !b.disputeResolution) {
                    const creativeSubmitted = !!b.disputeSubmissions?.creative;
                    const clientSubmitted = !!b.disputeSubmissions?.client;

                    if (!creativeSubmitted) {
                        disputeState = "submit_statement";
                    } else if (!clientSubmitted) {
                        disputeState = "awaiting_client";
                    } else {
                        disputeState = "awaiting_resolution";
                    }
                }

                // ── Filter PAID — only show if today ─────────────
                if (b.status === "PAID") {
                    console.log(
                        "Checking if booking is today:",
                        b._id,
                        b.dateBooked,
                        b.clientTimezone,
                    );
                    const startUtcMs = bookingStartToUtcMs(
                        b.dateBooked,
                        b.startTime,
                        b.clientTimezone ?? "UTC",
                    );
                    const bookingIsToday = isBookingToday(
                        startUtcMs,
                        b.clientTimezone ?? "UTC",
                    );
                    if (!bookingIsToday) return null;
                }

                if (
                    b.status === "COMPLETED" &&
                    b.paymentPhase !== "FINAL_PENDING"
                ) {
                    return null;
                }

                return {
                    id: b._id,
                    status: b.status,
                    orderNo: b.orderNo,
                    clientName,
                    clientAvatar: clientProfile?.avatar ?? null,
                    serviceName: service?.name ?? "Service",
                    dateBooked: b.dateBooked,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    clientTimezone: b.clientTimezone ?? "UTC",
                    disputeState,
                    disputeOpenedBy: b.disputeOpenedBy ?? null,
                    createdAt: b._creationTime,
                    paymentPhase: b.paymentPhase,
                };
            }),
        );

        const filtered = enriched.filter(Boolean);

        return {
            pending: filtered.filter(b => b!.status === "PENDING"),
            inProgress: filtered.filter(b => b!.status === "IN_PROGRESS"),
            paidToday: filtered.filter(b => b!.status === "PAID"),
            disputes: filtered.filter(b => b!.status === "DISPUTE"),
            awaitingFinalPayment: filtered.filter(
                // ← add
                b =>
                    b!.status === "COMPLETED" &&
                    b!.paymentPhase === "FINAL_PENDING",
            ),
        };
    },
});
