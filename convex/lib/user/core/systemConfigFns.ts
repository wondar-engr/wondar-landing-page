import { query } from "../../../_generated/server";
import { v } from "convex/values";

// Public-safe keys users can read
const USER_VISIBLE_CONFIG_KEYS = [
    "platform_fee_percent_total",
    "platform_fee_percent_client",
    "platform_fee_percent_creative",
    "booking_fee_percent_min",
    "booking_fee_percent_max",
    "default_currency",
    "supported_currencies",
    "cancellation_policy",
    "booking_fee_refundable",
    "maintenance_mode",
] as const;

type UserVisibleKey = (typeof USER_VISIBLE_CONFIG_KEYS)[number];

/**
 * Get all user-visible config needed by app screens.
 */
export const getUserSystemConfig = query({
    args: {},
    handler: async ctx => {
        const rows = await Promise.all(
            USER_VISIBLE_CONFIG_KEYS.map(key =>
                ctx.db
                    .query("systemConfig")
                    .withIndex("by_key", q => q.eq("key", key))
                    .unique(),
            ),
        );

        const map = Object.fromEntries(
            rows.filter(Boolean).map(row => [row!.key, row!.value]),
        ) as Record<UserVisibleKey, unknown>;

        return {
            fees: {
                totalPercent: Number(map.platform_fee_percent_total ?? 20),
                clientPercent: Number(map.platform_fee_percent_client ?? 5),
                creativePercent: Number(
                    map.platform_fee_percent_creative ?? 15,
                ),
            },
            booking: {
                minPercent: Number(map.booking_fee_percent_min ?? 20),
                maxPercent: Number(map.booking_fee_percent_max ?? 50),
                refundable: Boolean(map.booking_fee_refundable ?? false),
                cancellationPolicy: map.cancellation_policy ?? null,
            },
            currency: {
                default: String(map.default_currency ?? "usd"),
                supported: (map.supported_currencies as string[]) ?? ["usd"],
            },
            maintenanceMode: Boolean(map.maintenance_mode ?? false),
            raw: map, // optional convenience
        };
    },
});

/**
 * Get a single config by key (safe for user-consumable keys only).
 */
export const getUserSystemConfigByKey = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        if (!USER_VISIBLE_CONFIG_KEYS.includes(key as UserVisibleKey)) {
            throw new Error("Config key is not user-visible");
        }

        const row = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", key))
            .unique();

        return row ? row.value : null;
    },
});
