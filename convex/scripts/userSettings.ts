import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { DeviceEntry } from "../utils/userSettings";

/**
 * One-off cleanup for the userSettings table. Run from the Convex dashboard
 * (each deployment) as scripts/userSettings:mergeDuplicates
 *
 *   {}                      (dry run, changes nothing)
 *   { "dryRun": false }
 *
 * 1. A user with more than one settings row ends up with one (the oldest).
 *    Devices from all rows are combined; a notification switch stays on if
 *    it was on in any row.
 * 2. The same phone listed twice (two device ids, or one push token on two
 *    entries) becomes one entry, keeping the most recently used.
 */

const sameDevice = (a: DeviceEntry, b: DeviceEntry) =>
    a.deviceId === b.deviceId ||
    (!!a.pushToken && a.pushToken === b.pushToken);

function collapseDevices(devices: DeviceEntry[]): DeviceEntry[] {
    const out: DeviceEntry[] = [];
    // Newest first, so the entry we keep is the most recently used one
    const sorted = [...devices].sort((a, b) => b.lastUsed - a.lastUsed);

    for (const d of sorted) {
        const dup = out.find(x => sameDevice(x, d));
        if (!dup) {
            out.push({ ...d });
            continue;
        }
        dup.createdAt = Math.min(dup.createdAt, d.createdAt);
        if (!dup.pushToken && d.pushToken) dup.pushToken = d.pushToken;
    }
    return out;
}

export const mergeDuplicates = internalMutation({
    args: { dryRun: v.optional(v.boolean()) },
    handler: async (ctx, { dryRun = true }) => {
        const rows = await ctx.db.query("userSettings").collect();

        const byUser = new Map<string, typeof rows>();
        for (const r of rows) {
            byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
        }

        let usersWithDuplicateRows = 0;
        let rowsDeleted = 0;
        let devicesRemoved = 0;

        for (const group of byUser.values()) {
            group.sort((a, b) => a._creationTime - b._creationTime);
            const [keeper, ...extras] = group;

            const allDevices = group.flatMap(r => r.devices);
            const devices = collapseDevices(allDevices);

            const anyOn = <T extends Record<string, boolean>>(
                pick: (r: (typeof group)[number]) => T,
            ) => {
                const keys = Object.keys(pick(keeper)) as (keyof T)[];
                return Object.fromEntries(
                    keys.map(k => [k, group.some(r => pick(r)[k])]),
                ) as T;
            };

            const notifications = {
                channels: anyOn(r => r.notifications.channels),
                triggers: anyOn(r => r.notifications.triggers),
            };

            if (extras.length > 0) usersWithDuplicateRows++;
            rowsDeleted += extras.length;
            devicesRemoved += allDevices.length - devices.length;

            const changed =
                extras.length > 0 || devices.length !== keeper.devices.length;
            if (dryRun || !changed) continue;

            await ctx.db.patch(keeper._id, {
                devices,
                notifications,
                updatedAt: Date.now(),
            });
            for (const e of extras) await ctx.db.delete(e._id);
        }

        return {
            applied: !dryRun,
            users: byUser.size,
            usersWithDuplicateRows,
            rowsDeleted,
            devicesRemoved,
        };
    },
});
