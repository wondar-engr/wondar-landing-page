import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { PlatformDeviceUnion } from "../../unions";
import { CustomError } from "../../utils/errorUtils";
import {
    ensureUserSettings,
    getUserSettingsRow,
    upsertDeviceForUser,
} from "../../utils/userSettings";
import { v } from "convex/values";

const fail = (err: unknown, fallback: string) => {
    console.log("[ERR]:", err);
    return {
        status: false as const,
        error: err instanceof Error ? err.message : fallback,
    };
};

/**
 * Add or update a device
 * Kept for older app builds; same logic as core/settingsFns.upsertDevice.
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
            return fail(err, "Failed to upsert device.");
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

            const settings = await ensureUserSettings(ctx, userId);

            await ctx.db.patch(settings._id, {
                devices: settings.devices.map(device =>
                    device.deviceId === deviceId
                        ? { ...device, pushToken, lastUsed: Date.now() }
                        : device,
                ),
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            return fail(err, "Failed to update device push token.");
        }
    },
});

/**
 * Remove a device (used on log out so the next person on this phone, or the
 * old account, stops getting pushes meant for someone else)
 */
export const removeDevice = mutation({
    args: {
        deviceId: v.string(),
    },
    handler: async (ctx, { deviceId }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const settings = await getUserSettingsRow(ctx, userId);
            if (!settings) return { status: true };

            await ctx.db.patch(settings._id, {
                devices: settings.devices.filter(
                    device => device.deviceId !== deviceId,
                ),
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            return fail(err, "Failed to remove device.");
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

        return await getUserSettingsRow(ctx, userId);
    },
});

/**
 * Update notification preferences
 * Send only what changed: { channels: { phone: false } } turns push off and
 * leaves everything else as it was. "phone" is the push channel.
 */
export const updateNotificationPreferences = mutation({
    args: {
        channels: v.optional(
            v.object({
                phone: v.optional(v.boolean()),
                email: v.optional(v.boolean()),
            }),
        ),
        triggers: v.optional(
            v.object({
                booking: v.optional(v.boolean()),
                messaging: v.optional(v.boolean()),
                payment: v.optional(v.boolean()),
                general: v.optional(v.boolean()),
            }),
        ),
    },
    handler: async (ctx, { channels, triggers }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const settings = await ensureUserSettings(ctx, userId);
            const current = settings.notifications;

            const strip = <T extends Record<string, boolean | undefined>>(
                o: T | undefined,
            ) =>
                Object.fromEntries(
                    Object.entries(o ?? {}).filter(([, x]) => x !== undefined),
                );

            await ctx.db.patch(settings._id, {
                notifications: {
                    channels: { ...current.channels, ...strip(channels) },
                    triggers: { ...current.triggers, ...strip(triggers) },
                },
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            return fail(err, "Failed to update notification preferences.");
        }
    },
});
