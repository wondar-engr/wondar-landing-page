import { v } from "convex/values";
import { mutation, query, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { MutationCtx } from "../../_generated/server";

// ==========================================
// TYPES
// ==========================================

export type NotificationType =
    | "MESSAGE"
    | "BOOKING"
    | "GENERAL"
    | "ADMIN"
    | "REVIEW"
    | "PAYMENT";

export interface SendNotificationParams {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    meta?: {
        screen?: string;
        id?: string;
        [key: string]: any;
    };
    metaUser?: string;
}

// ==========================================
// MAIN SEND NOTIFICATION FUNCTION
// ==========================================

export async function sendNotification(
    ctx: MutationCtx,
    params: SendNotificationParams,
) {
    const { userId, title, body, type, meta, metaUser } = params;

    // 1. Create in-app notification
    const notificationId = await ctx.db.insert("notifications", {
        userId,
        title,
        content: body,
        read: false,
        type,
        meta,
        metaUser,
    });

    // 2. Get user settings for push notification
    const userSettings = await ctx.db
        .query("userSettings")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();

    if (!userSettings) {
        return { notificationId, pushSent: false, reason: "no_settings" };
    }

    // 3. Check if user has this notification type enabled
    const triggerKey = mapTypeToTrigger(type);
    if (triggerKey && !userSettings.notifications.triggers[triggerKey]) {
        return { notificationId, pushSent: false, reason: "disabled_by_user" };
    }

    // 4. Get active devices with push tokens
    const activeDevices = userSettings.devices.filter(
        device => device.isActive && device.pushToken,
    );

    if (activeDevices.length === 0) {
        return { notificationId, pushSent: false, reason: "no_push_tokens" };
    }

    // 5. Send push notification
    const pushTokens = activeDevices.map(d => d.pushToken!);

    await ctx.scheduler.runAfter(0, internal.lib.notifications.push.sendPush, {
        tokens: pushTokens,
        title,
        body,
        data: {
            type,
            notificationId,
            ...meta,
        },
    });

    return { notificationId, pushSent: true, deviceCount: pushTokens.length };
}

// ==========================================
// HELPER
// ==========================================

function mapTypeToTrigger(
    type: NotificationType,
): "booking" | "messaging" | "payment" | "general" | null {
    switch (type) {
        case "BOOKING":
            return "booking";
        case "MESSAGE":
            return "messaging";
        case "PAYMENT":
            return "payment";
        case "REVIEW":
        case "GENERAL":
        case "ADMIN":
            return "general";
        default:
            return null;
    }
}

// ==========================================
// QUERIES
// ==========================================

export const getNotifications = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("notifications")
            .withIndex("by_userId", q => q.eq("userId", args.userId))
            .order("desc")
            .take(args.limit || 50);
    },
});

export const getUnreadCount = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", args.userId).eq("read", false),
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
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read_status", q =>
                q.eq("userId", args.userId).eq("read", false),
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
