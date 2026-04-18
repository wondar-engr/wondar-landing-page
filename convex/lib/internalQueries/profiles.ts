// Add this query to your existing profiles.ts file

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get profile by userId
 */
export const getProfileByUserId = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .unique();

        return profile;
    },
});
