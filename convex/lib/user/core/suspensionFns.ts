import { query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";

export const getMyActiveSuspension = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const suspension = await ctx.db
            .query("userSuspensions")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("status"), "ACTIVE"))
            .order("desc")
            .first();

        if (!suspension) return null;

        return {
            reason: suspension.reason,
            end: suspension.end,
            lengthInDays: suspension.lengthInDays,
        };
    },
});
