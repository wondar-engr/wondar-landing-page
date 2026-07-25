import { v } from "convex/values";
import { internalMutation, mutation } from "../../../_generated/server";
import { BookingStatusUnion, DisputeOutcomeUnion } from "@convex/unions";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

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

        const newStatus =
            args.outcome === "CLIENT_FAVORED" || args.outcome === "SPLIT"
                ? "REFUNDED"
                : "COMPLETED";

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
