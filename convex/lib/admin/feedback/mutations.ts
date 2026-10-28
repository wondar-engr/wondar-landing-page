import { v } from "convex/values";
import { mutation } from "@convex/_generated/server";
import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { throwAppError } from "@convex/utils/helpers/error";

export const updateStatus = mutation({
    args: {
        id: v.id("feedbackReports"),
        status: v.union(
            v.literal("open"),
            v.literal("reviewed"),
            v.literal("resolved"),
            v.literal("closed"),
        ),
    },
    handler: async (ctx, { id, status }) => {
        const admin = await requireAdminProfile(ctx);

        const report = await ctx.db.get(id);
        if (!report) throwAppError("Report not found.");

        const now = Date.now();
        await ctx.db.patch(id, {
            status,
            updatedAt: now,
            // Only a resolved report carries resolver info
            resolvedBy: status === "resolved" ? admin._id : undefined,
            resolvedAt: status === "resolved" ? now : undefined,
        });

        return { success: true };
    },
});

export const setNotionUrl = mutation({
    args: {
        id: v.id("feedbackReports"),
        notionUrl: v.string(),
    },
    handler: async (ctx, { id, notionUrl }) => {
        await requireAdminProfile(ctx);

        const report = await ctx.db.get(id);
        if (!report) throwAppError("Report not found.");

        const trimmed = notionUrl.trim();
        if (trimmed && !/^https?:\/\//i.test(trimmed)) {
            throwAppError("Enter a valid link starting with http(s)://");
        }

        await ctx.db.patch(id, {
            notionUrl: trimmed || undefined,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
