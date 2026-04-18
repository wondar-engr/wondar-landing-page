import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { PlatformDeviceUnion } from "../../unions";
import { CustomError } from "../../utils/errorUtils";
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
                throw new CustomError(
                    "User settings not found. Complete onboarding first.",
                );
            }

            const now = Date.now();
            const existingDeviceIndex = settings.devices.findIndex(
                d => d.deviceId === args.deviceId,
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

/**
 * Update push token for a device
 * Called when token refreshes
 */
export const updateDevicePushToken = mutation({
    args: {
        deviceId: v.string(),
        pushToken: v.string(),
    },
    handler: async (ctx, { deviceId, pushToken }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const settings = await ctx.db
                .query("userSettings")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!settings) {
                throw new CustomError(
                    "User settings not found. Complete onboarding first.",
                );
            }

            const updatedDevices = settings.devices
                ? settings.devices.map(device =>
                      device.deviceId === deviceId
                          ? { ...device, pushToken, lastUsed: Date.now() }
                          : device,
                  )
                : [];

            await ctx.db.patch(settings._id, {
                devices: updatedDevices,
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update device push token.",
            };
        }
    },
});

/**
 * Remove a device
 */
export const removeDevice = mutation({
    args: {
        deviceId: v.string(),
    },
    handler: async (ctx, { deviceId }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const settings = await ctx.db
                .query("userSettings")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!settings) {
                throw new CustomError(
                    "User settings not found. Complete onboarding first.",
                );
            }

            const updatedDevices = settings.devices.filter(
                device => device.deviceId !== deviceId,
            );

            await ctx.db.patch(settings._id, {
                devices: updatedDevices,
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to remove device.",
            };
        }
    },
});

/**
 * Get user settings
 */
export const getUserSettings = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("userSettings")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();
    },
});

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = mutation({
    args: {
        channels: v.optional(
            v.object({
                phone: v.boolean(),
                email: v.boolean(),
                push: v.boolean(),
            }),
        ),
        triggers: v.optional(
            v.object({
                booking: v.boolean(),
                messaging: v.boolean(),
                payment: v.boolean(),
                general: v.boolean(),
                marketing: v.boolean(),
            }),
        ),
    },
    handler: async (ctx, { channels, triggers }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const settings = await ctx.db
                .query("userSettings")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!settings)
                throw new CustomError(
                    "User settings not found. Complete onboarding first.",
                );

            const updatedNotifications = {
                channels: channels || settings.notifications.channels,
                triggers: triggers || settings.notifications.triggers,
            };

            await ctx.db.patch(settings._id, {
                notifications: updatedNotifications,
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update notification preferences.",
            };
        }
    },
});
