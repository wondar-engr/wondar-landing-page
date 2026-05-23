import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getCustomerByUserId = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("stripeCustomers")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});
