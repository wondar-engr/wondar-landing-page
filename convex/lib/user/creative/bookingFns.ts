import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../../lib/notifications";
import { BookingStatusUnion } from "../../../unions";
import { internal } from "@convex/_generated/api";
import {
    formatCents,
    formatDate,
    formatTime,
} from "@convex/utils/helpers/bookings";
import { bookingEndToUtcMs, bookingStartToUtcMs } from "@convex/utils/time";
import { requireAuthUserId } from "@convex/utils/helpers/auth";
import { checkAndFlagCancellations } from "@convex/utils/helpers/cancellations";

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

        // ── Fetch context ─────────────────────────────────────────
        const [creativeProfile, clientProfile] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creativeId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
        ]);

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${creativeId.slice(-6)})`;

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";

        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;
        const upfrontFormatted = formatCents(booking.upfrontChargeAmount);

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

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✅ BOOKING ACCEPTED`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow} (${booking.clientTimezone ?? "UTC"})`,
                    ``,
                    `💰 Payment Due`,
                    `   Upfront:    ${upfrontFormatted}`,
                    `   Remaining:  ${formatCents(booking.remainingDueAmount)}`,
                    ``,
                    `ℹ️ Awaiting client upfront payment to confirm slot.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

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

        // ── Fetch context ─────────────────────────────────────────
        const [creativeProfile, clientProfile] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creativeId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
        ]);

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${creativeId.slice(-6)})`;

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;

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

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ BOOKING DECLINED — By Creative`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow} (${booking.clientTimezone ?? "UTC"})`,
                    ``,
                    `📝 Reason: ${reason}`,
                    `ℹ️ No payment was taken.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

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
        const clientTimezone = booking.clientTimezone ?? "UTC";
        const bookingStartMs = bookingStartToUtcMs(
            booking.dateBooked,
            booking.startTime,
            clientTimezone,
        );
        const bookingEndMs = bookingEndToUtcMs(
            booking.dateBooked,
            booking.endTime,
            clientTimezone,
        );
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

        // ── Fetch context ─────────────────────────────────────────
        const [creativeProfile, clientProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creativeId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${creativeId.slice(-6)})`;

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Service Started 🎬",
            body: "Your service has begun!",
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: creativeId,
        });

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🎬 SERVICE STARTED`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow} (${booking.clientTimezone ?? "UTC"})`,
                    ``,
                    `⏱ Started at: ${new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
                    `💰 Remaining due after completion: ${formatCents(booking.remainingDueAmount)}`,
                ].join("\n"),
                category: "BOOKINGS",
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

        // ── Fetch context ─────────────────────────────────────────
        const [creativeProfile, clientProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creativeId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${creativeId.slice(-6)})`;

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;
        const docsCount = jobCompletionDocs?.length ?? 0;

        if (service) {
            await ctx.db.patch(service._id, {
                stats: {
                    ...service.stats,
                    timesCompleted: (service.stats?.timesCompleted || 0) + 1,
                },
            });
        }

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Service Completed! ⭐",
            body: `${creativeName} has marked your service as complete. Please make your final payment to complete the booking. How was your experience? Leave a review!`,
            type: "BOOKING",
            meta: { screen: "booking_review", id: bookingId },
            metaUser: creativeId,
        });

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✅ SERVICE COMPLETED — By Creative`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow} (${booking.clientTimezone ?? "UTC"})`,
                    ``,
                    `📎 Completion Docs: ${docsCount} file${docsCount !== 1 ? "s" : ""} uploaded`,
                    `💰 Final Payment Due: ${formatCents(booking.remainingDueAmount)}`,
                    ``,
                    `ℹ️ Awaiting client's final payment and review.`,
                ].join("\n"),
                category: "BOOKINGS",
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

        await checkAndFlagCancellations(
            ctx,
            creativeId,
            "CREATIVE",
            booking.orderNo,
        );

        // ── Fetch context ─────────────────────────────────────────
        const [creativeProfile, clientProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", creativeId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${creativeId.slice(-6)})`;

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;

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

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ BOOKING CANCELLED — By Creative`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow} (${booking.clientTimezone ?? "UTC"})`,
                    ``,
                    `📝 Reason: ${reason}`,
                    `💰 Payment Phase: ${booking.paymentPhase}`,
                    booking.paymentPhase === "UPFRONT_PAID"
                        ? `⚠️ Client already paid upfront. Review refund eligibility.`
                        : `ℹ️ No payment was taken.`,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, status: "CANCELLED", reason };
    },
});

// ==========================================
// UPDATE JOB COMPLETION DOCS (Creative side)
// ==========================================

export const updateJobCompletionDocs = mutation({
    args: {
        bookingId: v.id("bookings"),
        docs: v.array(
            v.object({
                url: v.string(),
                type: v.union(
                    v.literal("PHOTO"),
                    v.literal("VIDEO"),
                    v.literal("DOCUMENT"),
                ),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthUserId(ctx);
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.creativeId !== userId) throw new Error("Unauthorized");
        if (
            booking.status !== "COMPLETED" &&
            booking.status !== "IN_PROGRESS"
        ) {
            throw new Error("Cannot update docs at this stage");
        }

        await ctx.db.patch(args.bookingId, {
            jobCompletionDocs: args.docs,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: booking.clientId,
            title: "Job Completion Docs Updated",
            body: `${booking.creativeId} has updated the job completion documents. Please review them.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: args.bookingId },
            metaUser: userId,
        });

        return { success: true };
    },
});
