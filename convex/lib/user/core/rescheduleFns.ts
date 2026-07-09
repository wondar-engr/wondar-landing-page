import { mutation, QueryCtx } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";
import { internal } from "@convex/_generated/api";
import { formatDate, formatTime } from "@convex/utils/helpers/bookings";
import { Doc } from "@convex/_generated/dataModel";

const MAX_RESCHEDULES = 2;
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

function isBefore24h(dateBooked: number, startTime: number) {
    const serviceDate = new Date(dateBooked);
    serviceDate.setHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
    return serviceDate.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

// ── Shared context fetcher ────────────────────────────────────────
async function getRescheduleContext(ctx: QueryCtx, booking: Doc<"bookings">) {
    const [clientProfile, creativeProfile, service] = await Promise.all([
        ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.clientId))
            .first(),
        ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
            .first(),
        ctx.db.get(booking.serviceId),
    ]);

    return {
        clientName: clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`,
        creativeName: creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${booking.creativeId.slice(-6)})`,
        serviceName: service?.name ?? "Unknown Service",
    };
}

export const requestReschedule = mutation({
    args: {
        bookingId: v.id("bookings"),
        newDateBooked: v.number(),
        newStartTime: v.number(),
        reason: v.optional(v.string()),
    },
    handler: async (
        ctx,
        { bookingId, newDateBooked, newStartTime, reason },
    ) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        const isClient = booking.clientId === userId;
        if (!isClient) throw new Error("Only client can request reschedule");

        if (
            [
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
                "REFUNDED",
                "DISPUTE",
            ].includes(booking.status)
        ) {
            throw new Error("Booking cannot be rescheduled at this stage");
        }

        if (!isBefore24h(booking.dateBooked, booking.startTime)) {
            throw new Error(
                "Reschedule must be requested at least 24 hours before service start",
            );
        }

        if ((booking.rescheduleCount ?? 0) >= MAX_RESCHEDULES) {
            throw new Error("Maximum reschedule limit reached");
        }

        const service = await ctx.db.get(booking.serviceId);
        if (!service) throw new Error("Service not found");

        const newEndTime = newStartTime + service.duration;

        const record = {
            requestedBy: userId,
            requestedAt: Date.now(),
            reason,
            oldDateBooked: booking.dateBooked,
            oldStartTime: booking.startTime,
            oldEndTime: booking.endTime,
            newDateBooked,
            newStartTime,
            newEndTime,
            status:
                booking.status === "PENDING"
                    ? ("APPROVED" as const)
                    : ("REQUESTED" as const),
            expiresAt: Date.now() + REQUEST_TTL_MS,
        };

        const ctx_ = await getRescheduleContext(ctx, booking);

        // PENDING — immediate apply
        if (booking.status === "PENDING") {
            await ctx.db.patch(bookingId, {
                dateBooked: newDateBooked,
                startTime: newStartTime,
                endTime: newEndTime,
                rescheduleStatus: "APPROVED",
                rescheduleCount: (booking.rescheduleCount ?? 0) + 1,
                rescheduleRequest: undefined,
                rescheduleHistory: [
                    ...(booking.rescheduleHistory ?? []),
                    record,
                ],
                updatedAt: Date.now(),
            });

            await ctx.scheduler.runAfter(
                0,
                internal.lib.appActions.notifications.sendTelegramNotification,
                {
                    text: [
                        `📅 RESCHEDULE — Applied Immediately (Pending Booking)`,
                        ``,
                        `📋 Order No:   ${booking.orderNo}`,
                        `🆔 Booking ID: ${bookingId}`,
                        `🎨 Creative:   ${ctx_.creativeName}`,
                        `👤 Client:     ${ctx_.clientName}`,
                        `🛠 Service:    ${ctx_.serviceName}`,
                        ``,
                        `📆 Old Date:   ${formatDate(booking.dateBooked)} ${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`,
                        `📆 New Date:   ${formatDate(newDateBooked)} ${formatTime(newStartTime)} → ${formatTime(newEndTime)}`,
                        reason ? `📝 Reason: ${reason}` : null,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    category: "BOOKINGS",
                },
            );

            return { success: true, mode: "IMMEDIATE" };
        }

        // CONFIRMED/PAID — approval workflow
        if (booking.rescheduleStatus === "REQUESTED") {
            throw new Error("A reschedule request is already pending");
        }

        await ctx.db.patch(bookingId, {
            rescheduleStatus: "REQUESTED",
            rescheduleRequest: record,
            updatedAt: Date.now(),
        });

        await sendNotification(ctx, {
            userId: booking.creativeId,
            title: "Reschedule Request",
            body: "You have a new booking reschedule request to review.",
            type: "BOOKING",
            meta: {
                screen: "booking_detail",
                id: bookingId,
                action: "RESCHEDULE_REQUEST",
            },
            metaUser: userId,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🔄 RESCHEDULE REQUESTED — Awaiting Creative Approval`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${ctx_.creativeName}`,
                    `👤 Client:     ${ctx_.clientName}`,
                    `🛠 Service:    ${ctx_.serviceName}`,
                    ``,
                    `📆 Old Date:   ${formatDate(booking.dateBooked)} ${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`,
                    `📆 New Date:   ${formatDate(newDateBooked)} ${formatTime(newStartTime)} → ${formatTime(newEndTime)}`,
                    reason ? `📝 Reason: ${reason}` : null,
                    ``,
                    `⏳ Expires in 24hrs if creative doesn't respond.`,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, mode: "REQUESTED" };
    },
});

export const respondRescheduleRequest = mutation({
    args: {
        bookingId: v.id("bookings"),
        approve: v.boolean(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { bookingId, approve, reason }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        const req = booking.rescheduleRequest;
        if (!req || booking.rescheduleStatus !== "REQUESTED") {
            throw new Error("No pending reschedule request");
        }

        if (req.requestedBy === userId) {
            throw new Error(
                "Requester cannot respond to own reschedule request",
            );
        }
        if (userId !== booking.clientId && userId !== booking.creativeId) {
            throw new Error("Not authorized");
        }

        if (Date.now() > req.expiresAt) {
            await ctx.db.patch(bookingId, {
                rescheduleStatus: "EXPIRED",
                rescheduleRequest: {
                    ...req,
                    status: "EXPIRED",
                    respondedBy: userId,
                    respondedAt: Date.now(),
                    responseReason: "Request expired",
                },
                updatedAt: Date.now(),
            });
            throw new Error("Reschedule request expired");
        }

        const nextStatus = approve ? "APPROVED" : "REJECTED";

        if (approve) {
            await ctx.db.patch(bookingId, {
                dateBooked: req.newDateBooked,
                startTime: req.newStartTime,
                endTime: req.newEndTime,
                rescheduleStatus: "APPROVED",
                rescheduleCount: (booking.rescheduleCount ?? 0) + 1,
                rescheduleHistory: [
                    ...(booking.rescheduleHistory ?? []),
                    {
                        ...req,
                        status: "APPROVED",
                        respondedBy: userId,
                        respondedAt: Date.now(),
                        responseReason: reason,
                    },
                ],
                rescheduleRequest: undefined,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.patch(bookingId, {
                rescheduleStatus: "REJECTED",
                rescheduleHistory: [
                    ...(booking.rescheduleHistory ?? []),
                    {
                        ...req,
                        status: "REJECTED",
                        respondedBy: userId,
                        respondedAt: Date.now(),
                        responseReason: reason,
                    },
                ],
                rescheduleRequest: undefined,
                updatedAt: Date.now(),
            });
        }

        const ctx_ = await getRescheduleContext(ctx, booking);
        const responderName =
            userId === booking.creativeId ? ctx_.creativeName : ctx_.clientName;

        // ── Notify requester ──────────────────────────────────────
        await sendNotification(ctx, {
            userId: req.requestedBy,
            title: approve ? "Reschedule Approved ✅" : "Reschedule Declined",
            body: approve
                ? "Your reschedule request was approved."
                : `Your reschedule request was declined${reason ? `: ${reason}` : "."}`,
            type: "BOOKING",
            meta: {
                screen: "booking_detail",
                id: bookingId,
                action: "RESCHEDULE_RESPONSE",
                approved: approve ? "YES" : "NO",
            },
            metaUser: userId,
        });

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    approve
                        ? `✅ RESCHEDULE APPROVED`
                        : `❌ RESCHEDULE REJECTED`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${ctx_.creativeName}`,
                    `👤 Client:     ${ctx_.clientName}`,
                    `🛠 Service:    ${ctx_.serviceName}`,
                    ``,
                    approve
                        ? `📆 New Date:   ${formatDate(req.newDateBooked)} ${formatTime(req.newStartTime)} → ${formatTime(req.newEndTime)}`
                        : `📆 Kept Date:  ${formatDate(booking.dateBooked)} ${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`,
                    `🗣 Response By: ${responderName}`,
                    reason ? `📝 Reason: ${reason}` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true, status: nextStatus };
    },
});

export const expireRescheduleRequest = mutation({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.db.get(bookingId);
        if (
            !booking ||
            booking.rescheduleStatus !== "REQUESTED" ||
            !booking.rescheduleRequest
        ) {
            return { success: false, skipped: true };
        }

        if (Date.now() <= booking.rescheduleRequest.expiresAt) {
            return { success: false, skipped: true };
        }

        const req = booking.rescheduleRequest;
        await ctx.db.patch(bookingId, {
            rescheduleStatus: "EXPIRED",
            rescheduleHistory: [
                ...(booking.rescheduleHistory ?? []),
                {
                    ...req,
                    status: "EXPIRED",
                    respondedAt: Date.now(),
                    responseReason: "Request expired",
                },
            ],
            rescheduleRequest: undefined,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

export const cancelRescheduleRequest = mutation({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, { bookingId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.clientId !== userId) {
            throw new Error(
                "Only the client can withdraw a reschedule request",
            );
        }
        if (booking.rescheduleStatus !== "REQUESTED") {
            throw new Error("No pending reschedule request to withdraw");
        }

        const req = booking.rescheduleRequest;
        if (!req) throw new Error("Reschedule request data missing");

        await ctx.db.patch(bookingId, {
            rescheduleStatus: "NONE",
            rescheduleRequest: undefined,
            rescheduleHistory: [
                ...(booking.rescheduleHistory ?? []),
                {
                    ...req,
                    status: "CANCELLED",
                    respondedBy: userId,
                    respondedAt: Date.now(),
                    responseReason: "Withdrawn by client",
                },
            ],
            updatedAt: Date.now(),
        });

        const ctx_ = await getRescheduleContext(ctx, booking);

        await sendNotification(ctx, {
            userId: booking.creativeId,
            title: "Reschedule Withdrawn",
            body: "The client has withdrawn their reschedule request.",
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `↩️ RESCHEDULE WITHDRAWN — By Client`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${ctx_.creativeName}`,
                    `👤 Client:     ${ctx_.clientName}`,
                    `🛠 Service:    ${ctx_.serviceName}`,
                    ``,
                    `📆 Keeping original: ${formatDate(booking.dateBooked)} ${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`,
                    `ℹ️ Client withdrew before creative responded.`,
                ].join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});
