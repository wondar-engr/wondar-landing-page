import { internalQuery } from "@convex/_generated/server";
import { requireAuthUserId } from "@convex/utils/helpers/auth";

export const getAdminProfile = internalQuery(async ctx => {
    const userId = await requireAuthUserId(ctx);

    const adminProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();

    if (!adminProfile || adminProfile.role !== "ADMIN") {
        return null;
    }

    return adminProfile;
});
