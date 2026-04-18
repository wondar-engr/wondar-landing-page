// Internal query to get user settings
import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

export const getUserSettings = internalQuery({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("userSettings")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .first();
    },
});
