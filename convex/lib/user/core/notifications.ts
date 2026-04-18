import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { getAuthUserId } from "../../../../convex/auth";

// ==========================================
// QUERIES
// ==========================================

export const getNotifications = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        return await ctx.db
            .query("notifications")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .take(args.limit || 50);
    },
});

export const getUnreadCount = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        return unread.length;
    },
});

// ==========================================
// MUTATIONS
// ==========================================

export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, { read: true });
    },
});

export const markAllAsRead = mutation({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { updated: 0 };
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", userId).eq("read", false),
            )
            .collect();

        await Promise.all(
            unread.map(notification =>
                ctx.db.patch(notification._id, { read: true }),
            ),
        );

        return { updated: unread.length };
    },
});

export const deleteNotification = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.notificationId);
    },
});
