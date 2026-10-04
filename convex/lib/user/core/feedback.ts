import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { getAuthUserId } from "../../../auth";

export const submit = mutation({
    args: {
        type: v.union(v.literal("BUG"), v.literal("FEATURE")),
        title: v.string(),
        description: v.string(),
        screenshotUrl: v.optional(v.string()),
        screenName: v.optional(v.string()),
        deviceInfo: v.string(),
        appVersion: v.string(),
        userRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        await ctx.db.insert("feedbackReports", {
            userId,
            email: profile?.email ?? "unknown",
            ...args,
            status: "open",
        });

        const emoji = args.type === "BUG" ? "🐛" : "💡";
        const label = args.type === "BUG" ? "BUG REPORT" : "FEATURE REQUEST";

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `${emoji} NEW ${label}`,
                    ``,
                    `👤 User:      ${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`,
                    `📧 Email:     ${profile?.email ?? "unknown"}`,
                    `🎭 Role:      ${args.userRole}`,
                    `📱 Device:    ${args.deviceInfo}`,
                    `📦 Version:   ${args.appVersion}`,
                    `📍 Screen:    ${args.screenName ?? "N/A"}`,
                    ``,
                    `📌 Title: ${args.title}`,
                    `📝 ${args.description}`,
                    ...(args.screenshotUrl
                        ? [``, `🖼 Screenshot: ${args.screenshotUrl}`]
                        : []),
                ].join("\n"),
                category: "GENERAL",
            },
        );

        return { success: true };
    },
});