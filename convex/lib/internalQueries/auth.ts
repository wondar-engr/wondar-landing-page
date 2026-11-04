import { internalQuery } from "@convex/_generated/server";
import { requireAuthUserId } from "@convex/utils/helpers/auth";
import { isAdminRole } from "@convex/utils/access";

export const getAdminProfile = internalQuery(async ctx => {
    const userId = await requireAuthUserId(ctx);

    const adminProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();

    if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return null;
    }

    return adminProfile;
});
