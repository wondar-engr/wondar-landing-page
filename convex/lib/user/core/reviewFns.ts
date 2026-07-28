import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "@convex/lib/notifications";
import { internal } from "@convex/_generated/api";

export const submitReview = mutation({
    args: {
        bookingId: v.id("bookings"),
        rating: v.number(),
        content: v.optional(v.string()),
    },
    handler: async (ctx, { bookingId, rating, content }) => {
        const authorId = await getAuthUserId(ctx);
        if (!authorId) throw new Error("Not authenticated");

        if (rating < 1 || rating > 5) throw new Error("Rating must be 1–5");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        const isClient = booking.clientId === authorId;
        const isCreative = booking.creativeId === authorId;
        if (!isClient && !isCreative) throw new Error("Not authorized");

        // Must be fully settled to review
        if (booking.paymentPhase !== "FULLY_SETTLED") {
            throw new Error("Booking must be fully settled before reviewing");
        }

        // One review per booking per author
        const existing = await ctx.db
            .query("reviews")
            .withIndex("by_author", q => q.eq("authorId", authorId))
            .filter(q => q.eq(q.field("bookingId"), bookingId))
            .first();

        if (existing) throw new Error("You have already reviewed this booking");

        const targetId = isClient ? booking.creativeId : booking.clientId;
        const role = isClient ? "CLIENT" : "CREATIVE";

        await ctx.db.insert("reviews", {
            bookingId,
            authorId,
            targetId,
            rating,
            content: content?.trim() ?? "",
            role,
        });

        // Update creative's aggregated stats
        if (isClient) {
            const creativeProfile = await ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", targetId))
                .first();

            if (creativeProfile) {
                const allReviews = await ctx.db
                    .query("reviews")
                    .withIndex("by_target", q => q.eq("targetId", targetId))
                    .collect();

                const totalReviews = allReviews.length;
                const averageRating =
                    allReviews.reduce((sum, r) => sum + r.rating, 0) /
                    totalReviews;

                await ctx.db.patch(creativeProfile._id, {
                    stats: {
                        ...creativeProfile.stats,
                        totalReviews,
                        averageRating: Math.round(averageRating * 10) / 10,
                        totalBookings:
                            creativeProfile.stats?.totalBookings ?? 0,
                        completedBookings:
                            creativeProfile.stats?.completedBookings ?? 0,
                    },
                });
            }
        }

        // Fetch author name for notification copy
        const authorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", authorId))
            .first();

        const authorName =
            `${authorProfile?.firstName ?? ""} ${authorProfile?.lastName ?? ""}`.trim() ||
            "Someone";

        const targetProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", targetId))
            .first();

        const targetName =
            `${targetProfile?.firstName ?? ""} ${targetProfile?.lastName ?? ""}`.trim() ||
            "User";

        const stars = "⭐".repeat(rating);

        // ── In-app notification to the person being reviewed ─────────────
        await sendNotification(ctx, {
            userId: targetId,
            title: isClient
                ? `New review from ${authorName}`
                : `${authorName} left you a review`,
            body: content?.trim()
                ? `${stars} "${content.trim().slice(0, 80)}"`
                : `${stars} — ${rating}/5 stars`,
            type: "REVIEW",
            meta: { screen: "booking_detail", id: bookingId },
        });

        // ── Telegram ──────────────────────────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `⭐ NEW REVIEW`,
                    ``,
                    `✍️ From:    ${authorName} (${role})`,
                    `🎯 To:      ${targetName}`,
                    `📋 Booking: #${booking.orderNo}`,
                    `⭐ Rating:  ${rating}/5 ${stars}`,
                    content?.trim()
                        ? `💬 Review:  "${content.trim().slice(0, 120)}"`
                        : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "GENERAL",
            },
        );

        return { success: true };
    },
});

export const getMyReviewForBooking = query({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const authorId = await getAuthUserId(ctx);
        if (!authorId) return null;

        return ctx.db
            .query("reviews")
            .withIndex("by_author", q => q.eq("authorId", authorId))
            .filter(q => q.eq(q.field("bookingId"), bookingId))
            .first();
    },
});

// Get the client's review for a booking (visible to both parties)
export const getBookingReview = query({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const booking = await ctx.db.get(bookingId);
        if (!booking) return null;

        // Only participants can see the review
        if (booking.clientId !== userId && booking.creativeId !== userId) {
            return null;
        }

        const review = await ctx.db
            .query("reviews")
            .withIndex("by_author", q => q.eq("authorId", booking.clientId))
            .filter(q => q.eq(q.field("bookingId"), bookingId))
            .first();

        if (!review) return null;

        // Get author profile for display
        const authorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", review.authorId))
            .first();

        return {
            ...review,
            authorName:
                `${authorProfile?.firstName ?? ""} ${authorProfile?.lastName ?? ""}`.trim(),
            authorAvatar: authorProfile?.avatar,
        };
    },
});

export const getMyReviews = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", userId))
            .order("desc")
            .collect();

        const enriched = await Promise.all(
            reviews.map(async review => {
                const authorProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", review.authorId),
                    )
                    .first();

                return {
                    ...review,
                    authorName:
                        `${authorProfile?.firstName ?? ""} ${authorProfile?.lastName ?? ""}`.trim(),
                    authorAvatar: authorProfile?.avatar,
                };
            }),
        );

        return enriched;
    },
});
