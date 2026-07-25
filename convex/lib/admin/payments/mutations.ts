import { v } from "convex/values";
import { action } from "@convex/_generated/server";
import { internal } from "@convex/_generated/api";

export const issueManualRefund = action({
    args: {
        bookingId: v.id("bookings"),
        amount: v.number(),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const admin = await ctx.runQuery(
            internal.lib.internalQueries.auth.getAdminProfile,
        );
        if (!admin) throw new Error("Unauthorized");

        await ctx.runAction(
            internal.lib.admin.stripe.actions.issueStripeRefund,
            {
                bookingId: args.bookingId,
                amount: args.amount,
                outcome: "CLIENT_FAVORED",
                resolutionNote: args.reason,
                resolvedBy:
                    `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim(),
            },
        );

        return { success: true };
    },
});
