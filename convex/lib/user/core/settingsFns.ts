import { mutation } from "@convex/_generated/server";
import { getAuthUserId } from "@convex/auth";
import { PlatformDeviceUnion } from "@convex/unions";
import { CustomError } from "@convex/utils/errorUtils";
import { v } from "convex/values";

/**
 * Add or update a device
 * Called when notifications permission is granted
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

            const settings = await ctx.db
                .query("userSettings")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!settings) {
                await ctx.db.insert("userSettings", {
                    userId,
                    notifications: {
                        channels: {
                            email: true,
                            phone: false,
                        },
                        triggers: {
                            booking: true,
                            messaging: true,
                            payment: true,
                            general: true,
                        },
                    },
                    devices: [
                        {
                            ...args,
                            isActive: true,
                            lastUsed: Date.now(),
                            createdAt: Date.now(),
                        },
                    ],
                    updatedAt: Date.now(),
                });
                return { status: true };
            }

            const now = Date.now();
            const existingDeviceIndex = settings.devices.findIndex(
                d =>
                    d.deviceId === args.deviceId ||
                    (args.pushToken && d.pushToken === args.pushToken),
            );

            const updatedDevices = [...settings.devices];

            if (existingDeviceIndex >= 0) {
                // Update existing device
                updatedDevices[existingDeviceIndex] = {
                    ...updatedDevices[existingDeviceIndex],
                    ...args,
                    pushToken: args.pushToken,
                    isActive: true,
                    lastUsed: now,
                };
            } else {
                // Add new device
                updatedDevices.push({
                    ...args,
                    isActive: true,
                    lastUsed: now,
                    createdAt: now,
                });
            }

            await ctx.db.patch(settings._id, {
                devices: updatedDevices,
                updatedAt: now,
            });

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
