import {
    internalAction,
    internalMutation,
    internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { sendNotification } from "../lib/notifications";

// ==========================================
// TEST 1: Check if user exists and has devices
// ==========================================
export const checkUserDevices = internalQuery({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        // Get user profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        // Get user devices
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        return {
            userExists: !!profile,
            userName: profile
                ? `${profile.firstName} ${profile.lastName}`
                : null,
            devicesCount: settings?.devices.length,
            devices: settings?.devices.map(d => ({
                id: d.deviceId,
                pushToken: d.pushToken,
                platform: d.platform,
                createdAt: new Date(d.createdAt).toISOString(),
            })),
        };
    },
});

// ==========================================
// TEST 2: Test sendNotification utility (DB + Push)
// ==========================================
export const testSendNotification = internalMutation({
    args: {
        userId: v.string(),
        title: v.optional(v.string()),
        body: v.optional(v.string()),
    },
    handler: async (ctx, { userId, title, body }) => {
        const testTitle = title || "🧪 Test Notification";
        const testBody = body || "This is a test notification from Convex!";

        try {
            await sendNotification(ctx, {
                userId: userId,
                title: testTitle,
                body: testBody,
                type: "GENERAL",
                meta: { screen: "test", testId: Date.now().toString() },
            });

            return {
                success: true,
                message: "sendNotification called successfully",
                userId: userId,
                title: testTitle,
                body: testBody,
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: (error as Error).message,
                stack: (error as Error).stack,
            };
        }
    },
});

// ==========================================
// TEST 3: Direct fetch to Expo API (no SDK)
// ==========================================
export const testDirectFetch = internalAction({
    args: {
        pushToken: v.string(),
        title: v.optional(v.string()),
        body: v.optional(v.string()),
    },
    handler: async (ctx, { pushToken, title, body }) => {
        const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

        const message = {
            to: pushToken,
            title: title || "🧪 Direct Fetch Test",
            body: body || "Testing Expo push via direct fetch!",
            sound: "default",
            priority: "high",
            data: { test: true, timestamp: Date.now() },
        };

        console.log("Sending push via direct fetch:", message);

        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([message]),
            });

            const responseText = await response.text();
            console.log("Expo API response status:", response.status);
            console.log("Expo API response body:", responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                result = responseText;
            }

            return {
                success: response.ok,
                status: response.status,
                result,
            };
        } catch (error: unknown) {
            console.error("Direct fetch error:", error);
            return {
                success: false,
                error: (error as Error).message,
                stack: (error as Error).stack,
            };
        }
    },
});

// ==========================================
// TEST 4: Test expo-server-sdk (current implementation)
// ==========================================
export const testExpoSDK = internalAction({
    args: {
        pushToken: v.string(),
        title: v.optional(v.string()),
        body: v.optional(v.string()),
    },
    handler: async (ctx, { pushToken, title, body }) => {
        try {
            // Dynamic import to see exact error
            console.log("Attempting to import expo-server-sdk...");
            await ctx.scheduler.runAfter(0, internal.push.sendPush, {
                tokens: [pushToken],
                title: title || "🧪 Expo SDK Test",
                body: body || "Testing Expo push via SDK!",
                data: {
                    type: "TEST",
                    notificationId: `test-${Date.now()}`,
                },
            });

            return {
                success: true,
            };
        } catch (error: unknown) {
            console.error("Expo SDK error:", error);
            return {
                success: false,
                error: (error as Error).message,
                stack: (error as Error).stack,
            };
        }
    },
});

// ==========================================
// TEST 6: Simple DB-only notification (no push)
// ==========================================
export const testDBNotification = internalMutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        try {
            const notificationId = await ctx.db.insert("notifications", {
                userId: userId,
                title: "🧪 DB Only Test",
                content: "This notification was saved to DB only (no push)",
                type: "GENERAL",
                meta: { test: true },
                read: false,
            });

            return {
                success: true,
                notificationId,
            };
        } catch (error: unknown) {
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    },
});
