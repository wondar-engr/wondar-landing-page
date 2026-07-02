import { internalMutation } from "@convex/_generated/server";
import { v } from "convex/values";

export const markTransactionRefunded = internalMutation({
    args: {
        stripePaymentIntentId: v.string(),
        refundedAmount: v.number(),
        refundReason: v.string(),
    },
    handler: async (ctx, args) => {
        const tx = await ctx.db
            .query("transactions")
            .withIndex("by_stripePaymentIntentId", q =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .first();

        if (!tx) return;

        await ctx.db.patch(tx._id, {
            status: "REFUNDED",
            refundedAmount: args.refundedAmount,
            refundReason: args.refundReason,
            refundedAt: Date.now(),
        });
    },
});
