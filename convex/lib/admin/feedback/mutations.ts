import { v } from "convex/values";
import { mutation } from "@convex/_generated/server";
import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { internal } from "@convex/_generated/api";
import { throwAppError } from "@convex/utils/helpers/error";
import {
  adminUrl,
  alertAdmins,
  notifyAssigned,
  profileName,
} from "@convex/utils/helpers/adminAlerts";

const reportLink = (id: string) => adminUrl(`/dashboard/feedback/${id}`);

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

    if (report.status !== status) {
      await alertAdmins(ctx, [
        `🔄 FEEDBACK STATUS: ${report.status} → ${status}`,
        ``,
        `📌 ${report.title}`,
        `✍️ By: ${profileName(admin)}`,
        `🔗 ${reportLink(id)}`,
      ]);
    }

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
      throwAppError(`Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }

    const id = await ctx.db.insert("feedbackComments", {
      reportId,
      authorId: admin._id,
      body: trimmed,
    });

    await alertAdmins(ctx, [
      `💬 NEW COMMENT on feedback`,
      ``,
      `📌 ${report.title}`,
      `✍️ ${profileName(admin)}: ${trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed}`,
      `🔗 ${reportLink(reportId)}`,
    ]);

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
      .withIndex("by_profile_report", (q) =>
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
    const admin = await requireAdminProfile(ctx);

    const report = await ctx.db.get(id);
    if (!report) throwAppError("Report not found.");

    // null clears a field, undefined leaves it alone
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (severity !== undefined) patch.severity = severity ?? undefined;
    if (ownerId !== undefined) patch.ownerId = ownerId ?? undefined;
    if (retestResult !== undefined)
      patch.retestResult = retestResult ?? undefined;

    await ctx.db.patch(id, patch);

    const changes: string[] = [];
    if (severity !== undefined && (severity ?? undefined) !== report.severity)
      changes.push(
        `Severity: ${report.severity ?? "none"} → ${severity ?? "none"}`,
      );
    if (
      retestResult !== undefined &&
      (retestResult ?? undefined) !== report.retestResult
    )
      changes.push(
        `Retest: ${report.retestResult ?? "none"} → ${retestResult ?? "none"}`,
      );
    if (ownerId === null && report.ownerId) changes.push("Owner removed");

    if (changes.length > 0) {
      await alertAdmins(ctx, [
        `🛠 FEEDBACK UPDATED`,
        ``,
        `📌 ${report.title}`,
        ...changes,
        `✍️ By: ${profileName(admin)}`,
        `🔗 ${reportLink(id)}`,
      ]);
    }

    await notifyAssigned(ctx, {
      previousOwnerId: report.ownerId,
      ownerId,
      actor: admin,
      kind: "feedback report",
      title: report.title,
      path: `/dashboard/feedback/${id}`,
    });

    return { success: true };
  },
});

const MAX_TITLE = 150;
const MAX_DESCRIPTION = 4000;

// An admin logs a report on someone's behalf, e.g. one that came in over
// WhatsApp or from a user who can't get into the app
export const createReport = mutation({
  args: {
    type: v.union(v.literal("BUG"), v.literal("FEATURE")),
    title: v.string(),
    description: v.string(),
    userRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
    email: v.string(), // who the report is about; ties it to their account
    reporterName: v.optional(v.string()),
    screenName: v.optional(v.string()),
    channel: v.optional(v.string()), // how it reached us, e.g. WhatsApp
    screenshots: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminProfile(ctx);

    const title = args.title.trim();
    const description = args.description.trim();
    const email = args.email.trim().toLowerCase();
    if (!title) throwAppError("Add a title.");
    if (!description) throwAppError("Describe what happened.");
    if (title.length > MAX_TITLE)
      throwAppError(`Titles can be up to ${MAX_TITLE} characters.`);
    if (description.length > MAX_DESCRIPTION)
      throwAppError(`Descriptions can be up to ${MAX_DESCRIPTION} characters.`);
    if (!/^\S+@\S+\.\S+$/.test(email))
      throwAppError("Enter a valid email for the person who reported it.");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const adminName =
      `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || admin.email;
    const reporterName =
      args.reporterName?.trim() ||
      (profile
        ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
        : "") ||
      undefined;

    const id = await ctx.db.insert("feedbackReports", {
      userId: profile?.userId ?? `external:${email}`,
      email,
      type: args.type,
      title,
      description,
      screenName: args.screenName?.trim() || undefined,
      screenshotUrl: args.screenshots?.[0],
      screenshots: args.screenshots?.length ? args.screenshots : undefined,
      deviceInfo: `Added by ${adminName}${args.channel ? ` (reported via ${args.channel})` : ""}`,
      appVersion: "N/A",
      userRole: args.userRole,
      status: "open",
      source: "ADMIN",
      reporterName,
      createdBy: admin._id,
    });

    // The creator wrote it, so it isn't unread for them
    await ctx.db.insert("feedbackReads", {
      reportId: id,
      profileId: admin._id,
      lastReadAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.lib.appActions.notifications.sendTelegramNotification,
      {
        text: [
          `${args.type === "BUG" ? "🐛" : "💡"} NEW ${args.type === "BUG" ? "BUG REPORT" : "FEATURE REQUEST"} (added by ${adminName})`,
          ``,
          `👤 About:     ${reporterName ?? email}`,
          `📧 Email:     ${email}`,
          `🎭 Role:      ${args.userRole}`,
          ...(args.channel ? [`💬 Via:       ${args.channel}`] : []),
          ``,
          `📌 Title: ${title}`,
          `📝 ${description}`,
          ...(args.screenshots?.length
            ? [``, `🖼 Images: ${args.screenshots.join(" ")}`]
            : []),
        ].join("\n"),
        category: "GENERAL",
      },
    );

    return { success: true, id };
  },
});

// Edit a report's content. Status and triage have their own controls.
export const updateReport = mutation({
  args: {
    id: v.id("feedbackReports"),
    type: v.union(v.literal("BUG"), v.literal("FEATURE")),
    title: v.string(),
    description: v.string(),
    userRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
    screenName: v.optional(v.string()),
    screenshots: v.array(v.string()),
    // Only reports an admin or the website created can change who they're about
    reporterName: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminProfile(ctx);

    const report = await ctx.db.get(args.id);
    if (!report) throwAppError("Report not found.");

    const title = args.title.trim();
    const description = args.description.trim();
    if (!title) throwAppError("Add a title.");
    if (!description) throwAppError("Describe what happened.");
    if (title.length > MAX_TITLE)
      throwAppError(`Titles can be up to ${MAX_TITLE} characters.`);
    if (description.length > MAX_DESCRIPTION)
      throwAppError(`Descriptions can be up to ${MAX_DESCRIPTION} characters.`);

    const patch: Record<string, unknown> = {
      type: args.type,
      title,
      description,
      userRole: args.userRole,
      screenName: args.screenName?.trim() || undefined,
      screenshots: args.screenshots.length ? args.screenshots : undefined,
      screenshotUrl: args.screenshots[0],
      updatedAt: Date.now(),
    };

    if (report.source === "ADMIN" || report.source === "WEBSITE") {
      patch.reporterName = args.reporterName?.trim() || undefined;
      if (args.email !== undefined) {
        const email = args.email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email))
          throwAppError("Enter a valid email.");
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();
        patch.email = email;
        patch.userId = profile?.userId ?? `external:${email}`;
      }
    }

    await ctx.db.patch(args.id, patch);

    await alertAdmins(ctx, [
      `✏️ FEEDBACK EDITED`,
      ``,
      `📌 ${title}`,
      `✍️ By: ${profileName(admin)}`,
      `🔗 ${reportLink(args.id)}`,
    ]);

    return { success: true };
  },
});
