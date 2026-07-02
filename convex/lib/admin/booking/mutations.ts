import { v } from "convex/values";
import { internalMutation, mutation } from "../../../_generated/server";
import { BookingStatusUnion, DisputeOutcomeUnion } from "@convex/unions";

// ── Resolve dispute (called from action after Stripe refund) ──────
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

        // Determine new booking status
        const newStatus =
            args.outcome === "CLIENT_FAVORED" || args.outcome === "SPLIT"
                ? "REFUNDED"
                : "COMPLETED";

        // Update booking
        await ctx.db.patch(args.bookingId, {
            status: newStatus,
            disputeResolution: {
                resolvedBy: args.resolvedBy,
                resolvedAt: Date.now(),
                outcome: args.outcome,
                note: args.resolutionNote,
            },
            updatedAt: Date.now(),
        });

        // Write to bookingDisputes audit table
        const existing = await ctx.db
            .query("bookingDisputes")
            .withIndex("by_bookingId", q => q.eq("bookingId", args.bookingId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: "RESOLVED",
                resolution:
                    args.outcome === "CLIENT_FAVORED" ||
                    args.outcome === "SPLIT"
                        ? "REFUND_CLIENT"
                        : "RELEASE_CREATIVE",
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
                resolution:
                    args.outcome === "CLIENT_FAVORED" ||
                    args.outcome === "SPLIT"
                        ? "REFUND_CLIENT"
                        : "RELEASE_CREATIVE",
                resolvedBy: args.resolvedBy,
                resolvedAt: Date.now(),
                resolutionNote: args.resolutionNote,
            });
        }

        return { success: true, newStatus };
    },
});

// ── Force update booking status ───────────────────────────────────
export const updateBookingStatus = mutation({
    args: {
        bookingId: v.id("bookings"),
        status: BookingStatusUnion,
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.bookingId, {
            status: args.status,
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
