import { mutation } from "../_generated/server";

/**
 * ONE-TIME SEED
 * Adds working_hours and working_hours_enforcement to systemConfig.
 * Safe to run multiple times — skips if keys already exist.
 * Run from Convex dashboard → Functions → migrations/seedWorkingHours → Run
 */
export const seedWorkingHours = mutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const results: { key: string; action: "created" | "skipped" }[] = [];

        const configs = [
            {
                key: "working_hours",
                value: {
                    start: 0, // 0 = midnight (full 24hr for testing)
                    end: 1440, // 1440 = midnight next day
                },
                description:
                    "Platform-wide working hours window. start and end are minutes from midnight. 0–1440 = full 24 hours.",
                category: "GENERAL" as const,
                isEditable: true,
            },
            {
                key: "working_hours_enforcement",
                value: false,
                description:
                    "Whether to enforce working_hours on time slot generation. false = 24hr mode (testing). true = enforce window.",
                category: "GENERAL" as const,
                isEditable: true,
            },
        ];

        for (const config of configs) {
            const existing = await ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", config.key))
                .unique();

            if (!existing) {
                await ctx.db.insert("systemConfig", {
                    ...config,
                    updatedAt: now,
                });
                results.push({ key: config.key, action: "created" });
            } else {
                results.push({ key: config.key, action: "skipped" });
            }
        }

        return { success: true, results };
    },
});
