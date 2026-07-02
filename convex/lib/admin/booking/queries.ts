import { v } from "convex/values";
import { query } from "../../..//_generated/server";
import { BookingStatusUnion } from "@convex/unions";
import { enrichBooking } from "@convex/utils/helpers/bookings";

// ── All bookings — paginated + filterable ─────────────────────────
export const getAllBookings = query({
    args: {
        status: v.optional(BookingStatusUnion),
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const status = args.status ?? "ALL";

        let bookings;

        if (status && status !== "ALL") {
            bookings = await ctx.db
                .query("bookings")
                .withIndex("by_status", q => q.eq("status", status))
                .order("desc")
                .take(limit);
        } else {
            bookings = await ctx.db.query("bookings").order("desc").take(limit);
        }

        // Search filter (orderNo)
        if (args.search) {
            const search = args.search.toLowerCase();
            bookings = bookings.filter(b =>
                b.orderNo?.toLowerCase().includes(search),
            );
        }

        return Promise.all(bookings.map(b => enrichBooking(ctx, b)));
    },
});

// ── Single booking — full detail ──────────────────────────────────
export const getBookingById = query({
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

// ── Dispute bookings only ─────────────────────────────────────────
export const getDisputeBookings = query({
    args: {},
    handler: async ctx => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_status", q => q.eq("status", "DISPUTE"))
            .order("desc")
            .take(100);

        return Promise.all(bookings.map(b => enrichBooking(ctx, b)));
    },
});

// ── Stats ─────────────────────────────────────────────────────────
export const getBookingStats = query({
    args: {},
    handler: async ctx => {
        const all = await ctx.db.query("bookings").collect();

        const counts = {
            total: all.length,
            pending: 0,
            confirmed: 0,
            paid: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            dispute: 0,
            refunded: 0,
        };

        for (const b of all) {
            switch (b.status) {
                case "PENDING":
                    counts.pending++;
                    break;
                case "CONFIRMED":
                    counts.confirmed++;
                    break;
                case "PAID":
                    counts.paid++;
                    break;
                case "IN_PROGRESS":
                    counts.inProgress++;
                    break;
                case "COMPLETED":
                    counts.completed++;
                    break;
                case "CANCELLED":
                    counts.cancelled++;
                    break;
                case "DISPUTE":
                    counts.dispute++;
                    break;
                case "REFUNDED":
                    counts.refunded++;
                    break;
            }
        }

        return counts;
    },
});
