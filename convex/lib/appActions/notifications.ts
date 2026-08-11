import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import axios from "axios";
import { internal } from "@convex/_generated/api";

export type TelegramCategory =
    "PAYMENTS" | "WEBHOOKS" | "DISPUTES" | "ACCOUNTS" | "BOOKINGS" | "GENERAL"; // fallback — maps to existing TG_GROUP_CHAT_ID

const CATEGORY_CHAT_IDS: Record<TelegramCategory, string> = {
    PAYMENTS: "TG_PAYMENTS_CHAT_ID",
    WEBHOOKS: "TG_WEBHOOKS_CHAT_ID",
    DISPUTES: "TG_DISPUTES_CHAT_ID",
    ACCOUNTS: "TG_ACCOUNTS_CHAT_ID",
    BOOKINGS: "TG_BOOKINGS_CHAT_ID",
    GENERAL: "TG_GROUP_CHAT_ID", // ← existing var, nothing breaks
};

/**
 * Internal action to send Telegram notification
 */
export const sendTelegramNotification = internalAction({
    args: {
        text: v.string(),
        category: v.optional(
            v.union(
                v.literal("PAYMENTS"),
                v.literal("WEBHOOKS"),
                v.literal("DISPUTES"),
                v.literal("ACCOUNTS"),
                v.literal("BOOKINGS"),
                v.literal("GENERAL"),
            ),
        ),
    },
    handler: async (_ctx, args) => {
        try {
            const category = args.category ?? "GENERAL";
            const envKey = CATEGORY_CHAT_IDS[category];
            const chatId = process.env[envKey] ?? process.env.TG_GROUP_CHAT_ID;
            if (!chatId) {
                console.warn(`[TELEGRAM] No chat ID for category: ${category}`);
                return false;
            }

            const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TG_BOT_KEY}`;
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: `${args.text}\n\n🕐 ${new Date().toUTCString()}`,
            });
            return true;
        } catch (err) {
            console.log(
                "[TELEGRAM_ERR]: Failed to send Telegram notification:",
                err,
            );
            return false;
        }
    },
});

export const sendMessageNotification = internalAction({
    args: {
        conversationId: v.id("conversations"),
        senderId: v.string(),
        otherUserId: v.string(),
        preview: v.string(),
    },
    handler: async (ctx, args) => {
        const senderProfile = await ctx.runQuery(
            internal.lib.internalQueries.profiles.getProfileByUserId,
            { userId: args.senderId },
        );

        const senderName = senderProfile
            ? `${senderProfile.firstName ?? ""} ${senderProfile.lastName ?? ""}`.trim()
            : "Someone";

        // Get push tokens directly
        const userSettings = await ctx.runQuery(
            internal.lib.internalQueries.settings.getUserSettings,
            { userId: args.otherUserId },
        );

        if (!userSettings) return;

        const activeTokens = userSettings.devices
            .filter(d => d.isActive && d.pushToken)
            .map(d => d.pushToken!);

        if (activeTokens.length === 0) return;

        await ctx.runAction(internal.push.sendPush, {
            tokens: activeTokens,
            title: senderName,
            body: args.preview,
            data: {
                type: "MESSAGE",
                screen: "conversation",
                id: args.conversationId,
                metaUser: args.senderId,
            },
        });
    },
});
