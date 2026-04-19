"use node";

import Expo from "expo-server-sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const expo = new Expo();

export const sendPush = internalAction({
    args: {
        tokens: v.array(v.string()),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (_ctx, args) => {
        // Filter valid Expo push tokens
        const validTokens = args.tokens.filter(token =>
            Expo.isExpoPushToken(token),
        );

        if (validTokens.length === 0) {
            console.log("[Push] No valid Expo push tokens");
            return { sent: 0 };
        }

        // Build messages
        const messages = validTokens.map(token => ({
            to: token,
            sound: "default" as const,
            title: args.title,
            body: args.body,
            data: args.data,
        }));

        // Chunk and send
        const chunks = expo.chunkPushNotifications(messages);
        let sent = 0;

        for (const chunk of chunks) {
            try {
                const ticketChunk =
                    await expo.sendPushNotificationsAsync(chunk);
                console.log("[Push] Tickets:", ticketChunk);
                sent += ticketChunk.filter(t => t.status === "ok").length;
            } catch (error) {
                console.error("[Push] Error:", error);
            }
        }

        return { sent, total: validTokens.length };
    },
});
