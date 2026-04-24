import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import axios from "axios";

/**
 * Internal action to send Telegram notification
 */
export const sendTelegramNotification = internalAction({
    args: {
        text: v.string(),
    },
    handler: async (_ctx, args) => {
        try {
            const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TG_BOT_KEY}`;
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: process.env.TG_GROUP_CHAT_ID,
                text: `${args.text}.\n\nEvent occurred on ${new Date().toUTCString()}`,
            });
            return true;
        } catch (err) {
            console.log("Failed to send Telegram notification:", err);
            return false;
        }
    },
});
