import { QueryCtx } from "../../../convex/_generated/server";

export const getProfileByUserId = async (ctx: QueryCtx, userId: string) => {
    const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .unique();

    return profile;
};
