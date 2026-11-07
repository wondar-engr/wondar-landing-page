import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * One place that owns the userSettings row, so every caller finds the same
 * row and nobody creates a second one.
 *
 * Reads use .first() on purpose: if a duplicate ever slips in, the app keeps
 * working (oldest row wins) instead of throwing "unique() returned more than
 * one result". The one-off script scripts/userSettings:mergeDuplicates
 * cleans up rows that already exist.
 */

export type UserSettingsDoc = Doc<"userSettings">;
export type DeviceEntry = UserSettingsDoc["devices"][number];

export type DeviceInput = {
    deviceId: string;
    deviceName: string;
    deviceManufacturer: string;
    osVersion: string;
    platform: DeviceEntry["platform"];
    pushToken?: string;
};

// Push is on by default; the "phone" channel is the push channel
export const DEFAULT_NOTIFICATIONS: UserSettingsDoc["notifications"] = {
    channels: { phone: true, email: true },
    triggers: { booking: true, messaging: true, payment: true, general: true },
};

export async function getUserSettingsRow(
    ctx: QueryCtx | MutationCtx,
    userId: string,
): Promise<UserSettingsDoc | null> {
    return await ctx.db
        .query("userSettings")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();
}

/**
 * Returns the user's settings row, creating it only when there is none.
 * Mutations run one at a time per document range, so two calls at once can't
 * both insert.
 */
export async function ensureUserSettings(
    ctx: MutationCtx,
    userId: string,
): Promise<UserSettingsDoc> {
    const existing = await getUserSettingsRow(ctx, userId);
    if (existing) return existing;

    const id = await ctx.db.insert("userSettings", {
        userId,
        notifications: DEFAULT_NOTIFICATIONS,
        devices: [],
        updatedAt: Date.now(),
    });
    return (await ctx.db.get(id))!;
}

/**
 * A device is "the same" when its id matches OR its push token matches.
 * The token check catches a phone that was registered earlier under an older
 * id format. Every matching entry collapses into one.
 */
export function mergeDevice(
    devices: DeviceEntry[],
    input: DeviceInput,
    now: number,
): DeviceEntry[] {
    const isSame = (d: DeviceEntry) =>
        d.deviceId === input.deviceId ||
        (!!input.pushToken && d.pushToken === input.pushToken);

    const matches = devices.filter(isSame);
    const others = devices.filter(d => !isSame(d));

    const oldest = matches.reduce<DeviceEntry | null>(
        (acc, d) => (!acc || d.createdAt < acc.createdAt ? d : acc),
        null,
    );
    // A silent re-register has no token: keep the one we already have
    const knownToken =
        input.pushToken ??
        matches.find(d => d.pushToken)?.pushToken ??
        undefined;

    const device: DeviceEntry = {
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        deviceManufacturer: input.deviceManufacturer,
        osVersion: input.osVersion,
        platform: input.platform,
        isActive: true,
        lastUsed: now,
        createdAt: oldest?.createdAt ?? now,
        ...(knownToken ? { pushToken: knownToken } : {}),
    };

    return [...others, device];
}

export async function upsertDeviceForUser(
    ctx: MutationCtx,
    userId: string,
    input: DeviceInput,
) {
    const settings = await ensureUserSettings(ctx, userId);
    const now = Date.now();

    await ctx.db.patch(settings._id, {
        devices: mergeDevice(settings.devices, input, now),
        updatedAt: now,
    });
}
