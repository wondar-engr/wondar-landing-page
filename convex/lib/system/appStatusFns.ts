import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../auth";

export const getAppStatus = query({
    args: {},
    handler: async ctx => {
        const config = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", "app_status"))
            .first();

        if (!config) {
            // No config = app is healthy
            return {
                maintenance: false,
                message: "",
                expectedBackAt: null as number | null,
                allowedUserIds: [] as string[],
            };
        }

        return config.value as {
            maintenance: boolean;
            message: string;
            expectedBackAt: number | null;
            allowedUserIds: string[];
        };
    },
});

// Admin only — toggle maintenance mode
export const setMaintenanceMode = mutation({
    args: {
        maintenance: v.boolean(),
        message: v.optional(v.string()),
        expectedBackAt: v.optional(v.number()),
    },
    handler: async (ctx, { maintenance, message, expectedBackAt }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const existing = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", "app_status"))
            .first();

        const value = {
            maintenance,
            message:
                message ??
                "We're performing scheduled maintenance. We'll be back shortly!",
            expectedBackAt: expectedBackAt ?? null,
            allowedUserIds: existing?.value?.allowedUserIds ?? [],
        };

        if (existing) {
            await ctx.db.patch(existing._id, {
                value,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
        } else {
            await ctx.db.insert("systemConfig", {
                key: "app_status",
                value,
                description: "Controls app-wide maintenance mode",
                category: "SYSTEM",
                isEditable: true,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
        }
    },
});
