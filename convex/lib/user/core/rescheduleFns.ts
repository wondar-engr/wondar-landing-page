import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";

// configurable policy
const MAX_RESCHEDULES = 2;
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

function isBefore24h(dateBooked: number, startTime: number) {
    const serviceDate = new Date(dateBooked);
    serviceDate.setHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
    return serviceDate.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

/**
 * Client or creative requests reschedule.
 * - If booking is PENDING: applies immediately.
 * - If CONFIRMED/PAID: creates REQUESTED workflow.
 */
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
        const isCreative = booking.creativeId === userId;
        if (!isClient && !isCreative) throw new Error("Not authorized");

        if (
            booking.status === "IN_PROGRESS" ||
            booking.status === "COMPLETED" ||
            booking.status === "CANCELLED" ||
            booking.status === "REFUNDED" ||
            booking.status === "DISPUTE"
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

        // PENDING: immediate apply (no approval needed)
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

            return { success: true, mode: "IMMEDIATE" };
        }

        // CONFIRMED/PAID: approval workflow
        if (booking.rescheduleStatus === "REQUESTED") {
            throw new Error("A reschedule request is already pending");
        }

        await ctx.db.patch(bookingId, {
            rescheduleStatus: "REQUESTED",
            rescheduleRequest: record,
            updatedAt: Date.now(),
        });

        const targetUserId = isClient ? booking.creativeId : booking.clientId;
        await sendNotification(ctx, {
            userId: targetUserId,
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

        return { success: true, mode: "REQUESTED" };
    },
});

/**
 * Only the opposite party can approve/reject pending request.
 */
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

        // only opposite side responds
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

        const notifyUserId = req.requestedBy;
        await sendNotification(ctx, {
            userId: notifyUserId,
            title: approve ? "Reschedule Approved" : "Reschedule Declined",
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

        return { success: true, status: nextStatus };
    },
});

/**
 * Optional manual expiry (cron-friendly).
 */
export const expireRescheduleRequest = mutation({
    args: {
        bookingId: v.id("bookings"),
    },
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
