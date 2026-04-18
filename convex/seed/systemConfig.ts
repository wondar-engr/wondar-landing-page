import { Doc } from "@convex/_generated/dataModel";
import { mutation } from "../_generated/server";

// Default system configuration values
const DEFAULT_CONFIG: Array<{
    key: string;
    value: unknown;
    description: string;
    category: Doc<"systemConfig">["category"];
    isEditable: boolean;
}> = [
    // ==========================================
    // PAYMENT FEES
    // ==========================================
    {
        key: "platform_fee_percent",
        value: 15,
        description: "Platform fee percentage taken from each transaction",
        category: "FEES" as const,
        isEditable: true,
    },
    {
        key: "stripe_fee_split_client",
        value: 50,
        description:
            "Percentage of Stripe processing fee paid by client (0-100)",
        category: "FEES" as const,
        isEditable: true,
    },
    {
        key: "stripe_fee_split_creative",
        value: 50,
        description:
            "Percentage of Stripe processing fee paid by creative (0-100)",
        category: "FEES" as const,
        isEditable: true,
    },
    {
        key: "min_service_fee",
        value: 500, // $5.00 in cents
        description: "Minimum service fee allowed (in cents)",
        category: "FEES" as const,
        isEditable: true,
    },
    {
        key: "max_service_fee",
        value: 1000000, // $10,000 in cents
        description: "Maximum service fee allowed (in cents)",
        category: "FEES" as const,
        isEditable: true,
    },

    // ==========================================
    // PAYOUT SETTINGS
    // ==========================================
    {
        key: "default_payout_schedule",
        value: {
            interval: "weekly",
            weeklyAnchor: "friday",
        },
        description: "Default payout schedule for new creative accounts",
        category: "PAYMENTS" as const,
        isEditable: true,
    },
    {
        key: "min_payout_amount",
        value: 100, // $1.00 in cents
        description: "Minimum amount required for manual payout (in cents)",
        category: "PAYMENTS" as const,
        isEditable: true,
    },
    {
        key: "payout_delay_days",
        value: 7,
        description: "Days to hold funds before payout eligibility",
        category: "PAYMENTS" as const,
        isEditable: true,
    },

    // ==========================================
    // BOOKING SETTINGS
    // ==========================================
    {
        key: "booking_fee_refundable",
        value: false,
        description: "Whether booking fee is refundable on cancellation",
        category: "BOOKINGS" as const,
        isEditable: true,
    },
    {
        key: "cancellation_policy",
        value: {
            tiers: [
                {
                    hoursBeforeAppointment: 48,
                    refundPercent: 100,
                    label: "Full refund",
                },
                {
                    hoursBeforeAppointment: 24,
                    refundPercent: 50,
                    label: "Half refund",
                },
                {
                    hoursBeforeAppointment: 12,
                    refundPercent: 25,
                    label: "Quarter refund",
                },
                {
                    hoursBeforeAppointment: 0,
                    refundPercent: 0,
                    label: "No refund",
                },
            ],
        },
        description:
            "Tiered cancellation policy based on hours before appointment",
        category: "BOOKINGS" as const,
        isEditable: true,
    },

    // ==========================================
    // CURRENCY SETTINGS
    // ==========================================
    {
        key: "default_currency",
        value: "usd",
        description: "Default platform currency",
        category: "PAYMENTS" as const,
        isEditable: false, // Don't change after launch
    },
    {
        key: "supported_currencies",
        value: ["usd"], // Can expand later: ["usd", "gbp", "eur", "cad"]
        description: "List of supported currencies",
        category: "PAYMENTS" as const,
        isEditable: true,
    },

    // ==========================================
    // STRIPE SETTINGS
    // ==========================================
    {
        key: "stripe_connect_account_type",
        value: "express",
        description:
            "Type of Stripe Connect account for creatives (express/standard)",
        category: "PAYMENTS" as const,
        isEditable: false,
    },
    {
        key: "stripe_webhook_tolerance_seconds",
        value: 300,
        description: "Webhook signature tolerance in seconds",
        category: "PAYMENTS" as const,
        isEditable: false,
    },

    // ==========================================
    // GENERAL SETTINGS
    // ==========================================
    {
        key: "maintenance_mode",
        value: false,
        description: "Enable maintenance mode (disable bookings/payments)",
        category: "GENERAL" as const,
        isEditable: true,
    },
    {
        key: "new_user_promo_enabled",
        value: false,
        description: "Enable promotional discount for new users",
        category: "GENERAL" as const,
        isEditable: true,
    },
    {
        key: "new_user_promo_percent",
        value: 10,
        description: "Discount percentage for new user promo",
        category: "GENERAL" as const,
        isEditable: true,
    },
];

/**
 * Seed system configuration
 * Run this once during initial setup
 */
export const seedSystemConfig = mutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        for (const config of DEFAULT_CONFIG) {
            // Check if config already exists
            const existing = await ctx.db
                .query("systemConfig")
                .withIndex("by_key", q => q.eq("key", config.key))
                .unique();

            if (!existing) {
                await ctx.db.insert("systemConfig", {
                    ...config,
                    updatedAt: now,
                });
                console.log(`[SEED] Created config: ${config.key}`);
            } else {
                console.log(`[SEED] Config exists: ${config.key}`);
            }
        }

        return { success: true, count: DEFAULT_CONFIG.length };
    },
});
