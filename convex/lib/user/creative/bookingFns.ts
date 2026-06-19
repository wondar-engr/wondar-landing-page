import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../../lib/notifications";
import { BookingStatusUnion } from "../../../unions";
import { internal } from "@convex/_generated/api";

// ==========================================
// GET CREATIVE BOOKINGS
// ==========================================

export const getCreativeBookings = query({
    args: {
        status: v.optional(BookingStatusUnion),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { status, limit = 20 }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) return [];

        let bookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", creativeId))
            .order("desc")
            .take(limit * 2);

        if (status) {
            bookings = bookings.filter(b => b.status === status);
        }

        const enriched = await Promise.all(
            bookings.slice(0, limit).map(async booking => {
                const service = await ctx.db.get(booking.serviceId);
                const clientProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.clientId),
                    )
                    .first();

                return {
                    ...booking,
                    service: service
                        ? { name: service.name, banners: service.banners }
                        : null,
                    client: clientProfile
                        ? {
                              firstName: clientProfile.firstName,
                              lastName: clientProfile.lastName,
                              avatar: clientProfile.avatar,
                          }
                        : null,
                };
            }),
        );

        return enriched;
    },
});

// ==========================================
// GET BOOKING BY ID (Creative View)
// ==========================================

export const getBookingById = query({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) return null;

        const booking = await ctx.db.get(bookingId);
        if (!booking || booking.creativeId !== creativeId) return null;

        const service = await ctx.db.get(booking.serviceId);

        const clientProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.clientId))
            .first();

        return {
            ...booking,
            service: service
                ? {
                      name: service.name,
                      duration: service.duration,
                      banners: service.banners,
                  }
                : null,
            client: clientProfile
                ? {
                      firstName: clientProfile.firstName,
                      lastName: clientProfile.lastName,
                      avatar: clientProfile.avatar,
                      phoneNumber: clientProfile.phoneNumber,
                  }
                : null,
        };
    },
});

// ==========================================
// ACCEPT BOOKING (PENDING → CONFIRMED)
// ==========================================

export const acceptBooking = mutation({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== creativeId)
            throw new Error("Not authorized");
        if (booking.status !== "PENDING")
            throw new Error("Booking is not pending");

        await ctx.db.patch(bookingId, {
            status: "CONFIRMED",
            updatedAt: Date.now(),
            paymentPhase: "UPFRONT_PENDING",
        });

        // update service stats
        const service = await ctx.db.get(booking.serviceId);
        if (service) {
            await ctx.db.patch(service._id, {
                stats: {
                    ...service.stats,
                    timesOrdered: (service.stats?.timesOrdered || 0) + 1,
                },
            });
        }

        const creativeProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", creativeId))
            .first();

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName || ""} ${creativeProfile.lastName || ""}`.trim()
            : "The creative";

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Booking Accepted ✅",
            body: `${creativeName} accepted your booking. Please pay ${booking.upfrontChargeAmount ? `$${(booking.upfrontChargeAmount / 100).toFixed(2)}` : "the upfront amount"} to secure your slot.`,
            type: "BOOKING",
            meta: {
                screen: "booking_detail",
                id: bookingId,
                action: "PAY_UPFRONT",
                amount: (booking.upfrontChargeAmount / 100).toString(),
                currency: booking.currency,
            },
            metaUser: creativeId,
        });

        return {
            success: true,
            status: "CONFIRMED",
            paymentPhase: "UPFRONT_PENDING",
            dueNow: booking.upfrontChargeAmount,
            dueAfterCompletion: booking.remainingDueAmount,
        };
    },
});

// ==========================================
// DECLINE BOOKING (PENDING → CANCELLED)
// ==========================================

export const declineBooking = mutation({
    args: {
        bookingId: v.id("bookings"),
        reason: v.string(),
    },
    handler: async (ctx, { bookingId, reason }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== creativeId)
            throw new Error("Not authorized");
        if (booking.status !== "PENDING")
            throw new Error("Booking is not pending");

        await ctx.db.patch(bookingId, {
            status: "CANCELLED",
            cancel: { by: creativeId, reason, date: Date.now() },
            updatedAt: Date.now(),
            paymentPhase: "NONE",
        });

        const service = await ctx.db.get(booking.serviceId);
        if (service) {
            await ctx.db.patch(service._id, {
                stats: {
                    ...service.stats,
                    timesCancelled: (service.stats?.timesCancelled || 0) + 1,
                },
            });
        }

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Booking Declined",
            body: `Your booking request was declined. Reason: ${reason}`,
            type: "BOOKING",
            meta: {
                screen: "booking_detail",
                id: bookingId,
                action: "DECLINED",
            },
            metaUser: creativeId,
        });

        return { success: true, status: "CANCELLED", reason };
    },
});

// ==========================================
// START SERVICE (CONFIRMED → IN_PROGRESS)
// ==========================================

export const startService = mutation({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== creativeId)
            throw new Error("Not authorized");

        if (booking.status !== "PAID")
            throw new Error("Cannot start this booking");

        if (booking.paymentPhase !== "UPFRONT_PAID") {
            throw new Error(
                "Upfront payment must be completed before starting",
            );
        }

        // Time window check — creative can only start within the booking window
        const now = Date.now();
        const bookingStartMs =
            booking.dateBooked + booking.startTime * 60 * 1000;
        const bookingEndMs = booking.dateBooked + booking.endTime * 60 * 1000;
        const oneHourBefore = bookingStartMs - 60 * 60 * 1000;

        if (now < oneHourBefore) {
            throw new Error(
                "You can only start the service within 1 hour of the scheduled time",
            );
        }
        if (now > bookingEndMs) {
            throw new Error("The booking window has already passed");
        }

        await ctx.db.patch(bookingId, {
            status: "IN_PROGRESS",
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Service Started 🎬",
            body: "Your service has begun!",
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: creativeId,
        });

        const service = await ctx.db.get(booking.serviceId);

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: `Booking ${bookingId} started by creative ${creativeId}. Client: ${booking.clientId}. Service: ${service ? service.name : "Unknown"}`,
            },
        );

        return { success: true };
    },
});

// ==========================================
// COMPLETE SERVICE (IN_PROGRESS → COMPLETED)
// ==========================================

export const completeService = mutation({
    args: {
        bookingId: v.id("bookings"),
        jobCompletionDocs: v.optional(
            v.array(
                v.object({
                    url: v.string(),
                    type: v.union(
                        v.literal("PHOTO"),
                        v.literal("VIDEO"),
                        v.literal("DOCUMENT"),
                    ),
                }),
            ),
        ),
    },
    handler: async (ctx, { bookingId, jobCompletionDocs }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== creativeId)
            throw new Error("Not authorized");
        if (booking.status !== "IN_PROGRESS")
            throw new Error("Cannot complete this booking");

        const now = Date.now();

        await ctx.db.patch(bookingId, {
            status: "COMPLETED",
            paymentPhase: "FINAL_PENDING",
            completedAt: now,
            completedBy: "CREATIVE",
            jobCompletionDocs: jobCompletionDocs ?? [],
            updatedAt: now,
        });

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Service Completed! ⭐",
            body: "How was your experience? Leave a review!",
            type: "REVIEW",
            meta: { screen: "booking_review", id: bookingId },
            metaUser: creativeId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: `Booking ${bookingId} marked as completed by creative ${creativeId}. Client: ${booking.clientId}.`,
            },
        );

        return { success: true };
    },
});

// ==========================================
// CANCEL BOOKING (Creative side)
// ==========================================

export const cancelBooking = mutation({
    args: {
        bookingId: v.id("bookings"),
        reason: v.string(),
    },
    handler: async (ctx, { bookingId, reason }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== creativeId)
            throw new Error("Not authorized");

        // Can only cancel if not completed or already cancelled
        if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
            throw new Error("Cannot cancel this booking");
        }

        await ctx.db.patch(bookingId, {
            status: "CANCELLED",
            cancel: { by: creativeId, reason, date: Date.now() },
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Booking Cancelled",
            body: `Your booking was cancelled by the creative. Reason: ${reason}`,
            type: "BOOKING",
            meta: {
                screen: "booking_detail",
                id: bookingId,
                action: "CANCELLED",
            },
            metaUser: creativeId,
        });

        return { success: true, status: "CANCELLED", reason };
    },
});
