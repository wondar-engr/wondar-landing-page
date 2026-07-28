import { query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";
import {
    bookingStartToUtcMs,
    isBookingToday,
    formatBookingDate,
} from "@convex/utils/time";

// ── Urgent bookings — client perspective ──────────────────────────
export const getClientUrgentBookings = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", userId))
            .filter(q =>
                q.or(
                    q.eq(q.field("status"), "CONFIRMED"),
                    q.eq(q.field("status"), "PAID"),
                    q.eq(q.field("status"), "IN_PROGRESS"),
                    q.eq(q.field("status"), "DISPUTE"),
                    q.eq(q.field("status"), "COMPLETED"), // ← add
                ),
            )
            .order("asc")
            .collect();

        const enriched = await Promise.all(
            bookings.map(async b => {
                const [creativeProfile, creativeBase, service] =
                    await Promise.all([
                        ctx.db
                            .query("creativeProfiles")
                            .withIndex("by_userId", q =>
                                q.eq("userId", b.creativeId),
                            )
                            .first(),
                        ctx.db
                            .query("profiles")
                            .withIndex("by_userId", q =>
                                q.eq("userId", b.creativeId),
                            )
                            .first(),
                        ctx.db.get(b.serviceId),
                    ]);

                const creativeName =
                    creativeProfile?.businessName ||
                    `${creativeBase?.firstName ?? ""} ${creativeBase?.lastName ?? ""}`.trim() ||
                    "Creative";

                // ── Dispute state — client perspective ────────────
                let disputeState:
                    | "submit_statement"
                    | "awaiting_creative"
                    | "awaiting_resolution"
                    | null = null;

                if (b.status === "DISPUTE" && !b.disputeResolution) {
                    const clientSubmitted = !!b.disputeSubmissions?.client;
                    const creativeSubmitted = !!b.disputeSubmissions?.creative;

                    if (!clientSubmitted) {
                        disputeState = "submit_statement";
                    } else if (!creativeSubmitted) {
                        disputeState = "awaiting_creative";
                    } else {
                        disputeState = "awaiting_resolution";
                    }
                }

                if (
                    b.status === "COMPLETED" &&
                    b.paymentPhase !== "FINAL_PENDING"
                ) {
                    return null;
                }

                // ── Filter PAID/IN_PROGRESS — only today ─────────
                if (b.status === "PAID" || b.status === "IN_PROGRESS") {
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

                return {
                    id: b._id,
                    status: b.status,
                    orderNo: b.orderNo,
                    creativeName,
                    creativeAvatar: creativeBase?.avatar ?? null,
                    serviceName: service?.name ?? "Service",
                    dateBooked: b.dateBooked,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    clientTimezone: b.clientTimezone ?? "UTC",
                    paymentPhase: b.paymentPhase,
                    disputeState,
                    disputeOpenedBy: b.disputeOpenedBy ?? null,
                    createdAt: b._creationTime,
                };
            }),
        );

        const filtered = enriched.filter(Boolean);

        return {
            // Needs payment — CONFIRMED but not yet paid deposit
            awaitingPayment: filtered.filter(
                b =>
                    (b!.status === "CONFIRMED" &&
                        b!.paymentPhase === "UPFRONT_PENDING") ||
                    (b!.status === "COMPLETED" &&
                        b!.paymentPhase === "FINAL_PENDING"),
            ),
            // Today's active
            inProgress: filtered.filter(b => b!.status === "IN_PROGRESS"),
            paidToday: filtered.filter(b => b!.status === "PAID"),
            disputes: filtered.filter(b => b!.status === "DISPUTE"),
        };
    },
});

// ── Recently booked creatives ─────────────────────────────────────
export const getRecentlyBookedCreatives = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Last 5 unique creatives the client has booked
        const recentBookings = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", userId))
            .filter(q =>
                q.or(
                    q.eq(q.field("status"), "COMPLETED"),
                    q.eq(q.field("status"), "PAID"),
                    q.eq(q.field("status"), "IN_PROGRESS"),
                    q.eq(q.field("status"), "CONFIRMED"),
                ),
            )
            .order("desc")
            .take(20);

        // Deduplicate by creativeId — keep most recent
        const seen = new Set<string>();
        const unique = recentBookings
            .filter(b => {
                if (seen.has(b.creativeId)) return false;
                seen.add(b.creativeId);
                return true;
            })
            .slice(0, 5);

        return Promise.all(
            unique.map(async b => {
                const [creativeProfile, profile, service] = await Promise.all([
                    ctx.db
                        .query("creativeProfiles")
                        .withIndex("by_userId", q =>
                            q.eq("userId", b.creativeId),
                        )
                        .first(),
                    ctx.db
                        .query("profiles")
                        .withIndex("by_userId", q =>
                            q.eq("userId", b.creativeId),
                        )
                        .first(),
                    ctx.db.get(b.serviceId),
                ]);

                const reviews = await ctx.db
                    .query("reviews")
                    .withIndex("by_target", q => q.eq("targetId", b.creativeId))
                    .collect();

                const rating =
                    reviews.length > 0
                        ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                          reviews.length
                        : 0;

                const services = await ctx.db
                    .query("services")
                    .withIndex("by_userId", q => q.eq("userId", b.creativeId))
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

                const categoryId = creativeProfile?.skills?.[0];
                const category = categoryId
                    ? await ctx.db.get(categoryId)
                    : null;

                return {
                    id: b.creativeId,
                    firstName: profile?.firstName ?? "",
                    lastName: profile?.lastName ?? "",
                    avatar: profile?.avatar ?? null,
                    coverImage: creativeProfile?.coverImage ?? "",
                    businessName: creativeProfile?.businessName ?? "",
                    skill: category?.name ?? "Creative",
                    rating: Math.round(rating * 10) / 10,
                    reviewCount: reviews.length,
                    startingPrice,
                    lastBookedService: service?.name ?? null,
                    lastBookedDate: formatBookingDate(b.dateBooked),
                };
            }),
        );
    },
});

// ── Client dashboard header data ──────────────────────────────────
export const getClientHeaderData = query({
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
