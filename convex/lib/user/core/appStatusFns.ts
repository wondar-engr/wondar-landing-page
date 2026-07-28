import { query } from "../../../_generated/server";

export const getAppStatus = query({
    args: {},
    handler: async ctx => {
        const [maintenanceMode, maintenanceFull] = await Promise.all([
            ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", "maintenance_mode"))
                .unique(),
            ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", "maintenance_full"))
                .unique(),
        ]);

        return {
            isMaintenanceMode: maintenanceMode?.value === true,
            isFullLockout: maintenanceFull?.value === true,
        };
    },
});
