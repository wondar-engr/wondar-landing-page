import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { getAuthUserId } from "@convex/auth";
import { sendNotification } from "@convex/lib/notifications";

export const clearCreativeNoShow = mutation({
    args: {
        userId: v.string(),
        previousCount: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx);
        if (!adminId) throw new Error("Unauthenticated");

        const adminProfile = await ctx.runQuery(
            internal.lib.internalQueries.profiles.getProfileByUserId,
            { userId: adminId },
        );

        const adminName =
            [adminProfile?.firstName, adminProfile?.lastName]
                .filter(Boolean)
                .join(" ") || "Admin";

        await ctx.runMutation(
            internal.lib.internalMuts.creatives.clearNoShowFlag,
            {
                userId: args.userId,
                clearedBy: adminName,
                previousCount: args.previousCount,
                note: args.note,
            },
        );

        await sendNotification(ctx, {
            userId: args.userId,
            title: "No-show flag cleared",
            body: `Your no-show flag has been cleared. Your account is now visible to clients for booking.`,
            type: "ADMIN",
            meta: {},
        });

        const userProfile = await ctx.runQuery(
            internal.lib.internalQueries.profiles.getProfileByUserId,
            { userId: args.userId },
        );

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🏳️ NO-SHOW FLAG CLEARED`,
                    ``,
                    `👤 Creative:  ${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`,
                    `🔢 Previous count: ${args.previousCount}`,
                    `👮 Cleared by: ${adminName}`,
                    args.note ? `📝 Note: ${args.note}` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "ACCOUNTS",
            },
        );

        return { success: true };
    },
});
