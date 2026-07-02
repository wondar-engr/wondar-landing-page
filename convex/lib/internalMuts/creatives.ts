import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const clearNoShowFlag = internalMutation({
    args: {
        userId: v.string(),
        clearedBy: v.string(),
        previousCount: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Write history record first
        await ctx.db.insert("noShowHistory", {
            userId: args.userId,
            clearedBy: args.clearedBy,
            clearedAt: Date.now(),
            previousCount: args.previousCount,
            note: args.note,
        });

        // Reset count on creativeProfile
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .first();

        if (creativeProfile) {
            await ctx.db.patch(creativeProfile._id, {
                noShowCount: 0,
                accountStatus: "ACTIVE",
            });
        }

        return { success: true };
    },
});
