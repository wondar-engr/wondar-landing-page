import { v } from "convex/values";
import { internalMutation, mutation } from "../../../_generated/server";
import { BookingStatusUnion, DisputeOutcomeUnion } from "@convex/unions";
import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { sendNotification } from "@convex/lib/notifications";
import { throwAppError } from "@convex/utils/helpers/error";

// ── internalMutation — called from Stripe action, no auth ctx available
export const resolveDispute = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        outcome: DisputeOutcomeUnion,
        resolutionNote: v.string(),
        resolvedBy: v.string(),
        refundAmount: v.optional(v.number()),
        splitPercent: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) throw new Error("Booking not found");

        const noPay = booking.disputeReason === "CLIENT_NO_PAY";
        const newStatus =
            args.outcome === "CLIENT_FAVORED" || args.outcome === "SPLIT"
                ? "REFUNDED"
                : noPay
                  ? "CANCELLED" // service never happened; creative keeps what was paid
                  : "COMPLETED";

        const now = Date.now();
        const releasing = newStatus === "COMPLETED";
        const needsFinalPayment =
            releasing && booking.paymentPhase === "UPFRONT_PAID";

        await ctx.db.patch(args.bookingId, {
            status: newStatus,
            disputeResolution: {
                resolvedBy: args.resolvedBy,
                resolvedAt: now,
                outcome: args.outcome,
                note: args.resolutionNote,
            },
            ...(newStatus === "CANCELLED"
                ? { cancelReason: "CLIENT_NO_PAY", cancelledAt: now }
                : {}),
            ...(needsFinalPayment
                ? {
                      paymentPhase: "FINAL_PENDING" as const,
                      completedAt: booking.completedAt ?? now,
                      completedBy: "SYSTEM" as const,
                  }
                : {}),
            updatedAt: now,
        });

        // Count the job once, on whichever route completes it first
        if (releasing && !booking.completedAt) {
            const service = await ctx.db.get(booking.serviceId);
            if (service) {
                await ctx.db.patch(service._id, {
                    stats: {
                        ...service.stats,
                        timesCompleted: service.stats.timesCompleted + 1,
                    },
                });
            }
        }

        // Tell the client the remaining balance is now payable
        if (needsFinalPayment) {
            await sendNotification(ctx, {
                userId: booking.clientId,
                title: "Final Payment Due",
                body: `Your dispute was resolved. Please complete your final payment of $${(booking.remainingDueAmount / 100).toFixed(2)} to close out the booking.`,
                type: "BOOKING",
                meta: {
                    screen: "booking_detail",
                    id: booking._id,
                    action: "PAY_FINAL",
                },
            });
        }

        const existing = await ctx.db
            .query("bookingDisputes")
            .withIndex("by_bookingId", q => q.eq("bookingId", args.bookingId))
            .first();

        const resolution =
            args.outcome === "CLIENT_FAVORED" || args.outcome === "SPLIT"
                ? "REFUND_CLIENT"
                : "RELEASE_CREATIVE";

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: "RESOLVED",
                resolution,
                resolvedBy: args.resolvedBy,
                resolvedAt: Date.now(),
                resolutionNote: args.resolutionNote,
            });
        } else {
            await ctx.db.insert("bookingDisputes", {
                bookingId: args.bookingId,
                clientId: booking.clientId,
                creativeId: booking.creativeId,
                reason: booking.disputeReason ?? "OTHER",
                clientStatement: booking.disputeSubmissions?.client?.text,
                clientEvidence:
                    booking.disputeSubmissions?.client?.evidence ?? [],
                clientSubmittedAt:
                    booking.disputeSubmissions?.client?.submittedAt,
                creativeStatement: booking.disputeSubmissions?.creative?.text,
                creativeEvidence:
                    booking.disputeSubmissions?.creative?.evidence ?? [],
                creativeSubmittedAt:
                    booking.disputeSubmissions?.creative?.submittedAt,
                status: "RESOLVED",
                resolution,
                resolvedBy: args.resolvedBy,
                resolvedAt: Date.now(),
                resolutionNote: args.resolutionNote,
            });
        }

        return { success: true, newStatus };
    },
});

// ── Admin-only mutations
export const updateBookingStatus = mutation({
    args: {
        bookingId: v.id("bookings"),
        status: BookingStatusUnion,
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        await ctx.db.patch(args.bookingId, {
            status: args.status,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
