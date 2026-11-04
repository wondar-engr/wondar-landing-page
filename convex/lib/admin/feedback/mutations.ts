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

const MAX_COMMENT_LENGTH = 2000;

export const addComment = mutation({
    args: {
        reportId: v.id("feedbackReports"),
        body: v.string(),
    },
    handler: async (ctx, { reportId, body }) => {
        const admin = await requireAdminProfile(ctx);

        const report = await ctx.db.get(reportId);
        if (!report) throwAppError("Report not found.");

        const trimmed = body.trim();
        if (!trimmed) throwAppError("Write a comment first.");
        if (trimmed.length > MAX_COMMENT_LENGTH) {
            throwAppError(
                `Comments can be up to ${MAX_COMMENT_LENGTH} characters.`,
            );
        }

        const id = await ctx.db.insert("feedbackComments", {
            reportId,
            authorId: admin._id,
            body: trimmed,
        });

        return { success: true, id };
    },
});

export const deleteComment = mutation({
    args: { id: v.id("feedbackComments") },
    handler: async (ctx, { id }) => {
        const admin = await requireAdminProfile(ctx);

        const comment = await ctx.db.get(id);
        if (!comment) throwAppError("Comment not found.");

        // Admins can only remove their own comments
        if (comment.authorId !== admin._id) {
            throwAppError("You can only delete your own comments.");
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

export const markRead = mutation({
    args: { reportId: v.id("feedbackReports") },
    handler: async (ctx, { reportId }) => {
        const admin = await requireAdminProfile(ctx);

        const existing = await ctx.db
            .query("feedbackReads")
            .withIndex("by_profile_report", q =>
                q.eq("profileId", admin._id).eq("reportId", reportId),
            )
            .unique();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { lastReadAt: now });
        } else {
            await ctx.db.insert("feedbackReads", {
                reportId,
                profileId: admin._id,
                lastReadAt: now,
            });
        }

        return { success: true };
    },
});

export const updateTriage = mutation({
    args: {
        id: v.id("feedbackReports"),
        severity: v.optional(
            v.union(
                v.literal("LOW"),
                v.literal("MEDIUM"),
                v.literal("HIGH"),
                v.literal("CRITICAL"),
                v.null(),
            ),
        ),
        ownerId: v.optional(v.union(v.id("profiles"), v.null())),
        retestResult: v.optional(
            v.union(v.literal("PASS"), v.literal("FAIL"), v.null()),
        ),
    },
    handler: async (ctx, { id, severity, ownerId, retestResult }) => {
        await requireAdminProfile(ctx);

        const report = await ctx.db.get(id);
        if (!report) throwAppError("Report not found.");

        // null clears a field, undefined leaves it alone
        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        if (severity !== undefined) patch.severity = severity ?? undefined;
        if (ownerId !== undefined) patch.ownerId = ownerId ?? undefined;
        if (retestResult !== undefined)
            patch.retestResult = retestResult ?? undefined;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});
