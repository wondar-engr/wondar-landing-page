import { mutation, query } from "../../_generated/server";
import { SystemConfigCategoryUnion } from "../../unions";
import { v } from "convex/values";

/**
 * Get a single config value by key
 */
export const getConfig = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", args.key))
            .unique();

        return config?.value ?? null;
    },
});

/**
 * Get multiple config values by keys
 */
export const getConfigs = query({
    args: { keys: v.array(v.string()) },
    handler: async (ctx, args) => {
        const configs: Record<string, unknown> = {};

        for (const key of args.keys) {
            const config = await ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", key))
                .unique();

            configs[key] = config?.value ?? null;
        }

        return configs;
    },
});

/**
 * Get all configs by category
 */
export const getConfigsByCategory = query({
    args: {
        category: SystemConfigCategoryUnion,
    },
    handler: async (ctx, args) => {
        const configs = await ctx.db
            .query("systemConfig")
            .withIndex("by_category", q => q.eq("category", args.category))
            .collect();

        return configs;
    },
});

/**
 * Get all configs (admin only)
 */
export const getAllConfigs = query({
    args: {},
    handler: async ctx => {
        // TODO: Add admin check
        const configs = await ctx.db.query("systemConfig").collect();
        return configs;
    },
});

/**
 * Update a config value (admin only)
 */
export const updateConfig = mutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        // TODO: Add admin check
        // const userId = await getAuthUserId(ctx);
        // const isAdmin = await checkIsAdmin(ctx, userId);
        // if (!isAdmin) throw new Error("Unauthorized");

        const config = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", args.key))
            .unique();

        if (!config) {
            throw new Error(`Config not found: ${args.key}`);
        }

        if (!config.isEditable) {
            throw new Error(`Config is not editable: ${args.key}`);
        }

        await ctx.db.patch(config._id, {
            value: args.value,
            updatedAt: Date.now(),
            // updatedBy: userId,
        });

        return { success: true };
    },
});

/**
 * Bulk update configs (admin only)
 */
export const updateConfigs = mutation({
    args: {
        updates: v.array(
            v.object({
                key: v.string(),
                value: v.any(),
            }),
        ),
    },
    handler: async (ctx, args) => {
        // TODO: Add admin check

        const results = [];

        for (const update of args.updates) {
            const config = await ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", update.key))
                .unique();

            if (!config) {
                results.push({
                    key: update.key,
                    success: false,
                    error: "Not found",
                });
                continue;
            }

            if (!config.isEditable) {
                results.push({
                    key: update.key,
                    success: false,
                    error: "Not editable",
                });
                continue;
            }

            await ctx.db.patch(config._id, {
                value: update.value,
                updatedAt: Date.now(),
            });

            results.push({ key: update.key, success: true });
        }

        return results;
    },
});
