import { mutation } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";

// Don't write more often than this, however often the app calls
const MIN_GAP_MS = 2 * 60 * 1000;

// Called by the app when it opens or comes back to the foreground. Feeds
// "last seen" in the admin and the Big Ten reports.
export const heartbeat = mutation({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { updated: false };

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();
        if (!profile) return { updated: false };

        const now = Date.now();
        if (profile.lastSeen && now - profile.lastSeen < MIN_GAP_MS) {
            return { updated: false };
        }

        await ctx.db.patch(profile._id, { lastSeen: now });
        return { updated: true };
    },
});
