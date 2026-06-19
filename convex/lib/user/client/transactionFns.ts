import { paginationOptsValidator } from "convex/server";
import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";

export const getMyTransactionsPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.string()), // filter by status
        phase: v.optional(v.string()), // filter by UPFRONT | FINAL
    },
    handler: async (ctx, { paginationOpts, status, phase }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        let queryBuilder = ctx.db
            .query("transactions")
            .withIndex("by_clientId", q => q.eq("clientId", userId))
            .order("desc");

        const result = await queryBuilder.paginate(paginationOpts);

        // Filter after pagination if filters are applied
        const filtered = result.page.filter(tx => {
            if (status && tx.status !== status) return false;
            if (phase && tx.phase !== phase) return false;
            return true;
        });

        // Enrich with booking + service info
        const enriched = await Promise.all(
            filtered.map(async tx => {
                const booking = await ctx.db.get(tx.bookingId);
                const service = booking
                    ? await ctx.db.get(booking.serviceId)
                    : null;

                return {
                    ...tx,
                    serviceName: service?.name ?? "Unknown Service",
                    bookingDate: booking?.dateBooked ?? null,
                    bookingOrderNo: booking?.orderNo ?? null,
                };
            }),
        );

        return {
            ...result,
            page: enriched,
        };
    },
});
