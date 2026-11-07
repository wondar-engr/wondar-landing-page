import { mutation } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";
import { PlatformDeviceUnion } from "@convex/unions";
import { CustomError } from "@convex/utils/errorUtils";
import { upsertDeviceForUser } from "@convex/utils/userSettings";
import { v } from "convex/values";

/**
 * Add or update a device
 * Called when the app starts and when notifications permission is granted.
 * Same device (same id or same push token) is always updated, never added twice.
 */
export const upsertDevice = mutation({
    args: {
        deviceId: v.string(),
        deviceName: v.string(),
        deviceManufacturer: v.string(),
        osVersion: v.string(),
        platform: PlatformDeviceUnion,
        pushToken: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            await upsertDeviceForUser(ctx, userId, args);

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to upsert device.",
            };
        }
    },
});
