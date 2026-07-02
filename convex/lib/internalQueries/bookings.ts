import { internalQuery } from "@convex/_generated/server";
import { enrichBooking } from "@convex/utils/helpers/bookings";
import { v } from "convex/values";

// ── Single booking — full detail ──────────────────────────────────
export const getBookingById = internalQuery({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) return null;

        const enriched = await enrichBooking(ctx, booking);

        // Fetch dispute record if exists
        const dispute = await ctx.db
            .query("bookingDisputes")
            .withIndex("by_bookingId", q => q.eq("bookingId", args.bookingId))
            .first();

        return { ...enriched, disputeRecord: dispute ?? null };
    },
});
