import { v } from "convex/values";
import { mutation } from "@convex/_generated/server";
import { requireAccessProfile } from "@convex/utils/helpers/auth";
import { throwAppError } from "@convex/utils/helpers/error";
import {
  alertAdmins,
  notifyAssigned,
  profileName,
} from "@convex/utils/helpers/adminAlerts";

export const setStatus = mutation({
  args: {
    id: v.id("contactMessages"),
    status: v.union(
      v.literal("NEW"),
      v.literal("HANDLED"),
      v.literal("ARCHIVED"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const admin = await requireAccessProfile(ctx, "messages");
    const message = await ctx.db.get(id);
    if (!message) throwAppError("Message not found.");

    await ctx.db.patch(id, {
      status,
      handledBy: status === "NEW" ? undefined : admin._id,
      handledAt: status === "NEW" ? undefined : Date.now(),
    });
    return { success: true };
  },
});

// Turns a message into a feedback report when it turns out to be a bug or idea
export const moveToFeedback = mutation({
  args: {
    id: v.id("contactMessages"),
    type: v.union(v.literal("BUG"), v.literal("FEATURE")),
    role: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
  },
  handler: async (ctx, { id, type, role }) => {
    const admin = await requireAccessProfile(ctx, "messages");
    const message = await ctx.db.get(id);
    if (!message) throwAppError("Message not found.");
    if (message.feedbackReportId)
      throwAppError("This message is already in Feedback.");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", message.email))
      .first();

    const reportId = await ctx.db.insert("feedbackReports", {
      userId: profile?.userId ?? `external:${message.email}`,
      email: message.email,
      type,
      title: message.message.slice(0, 80).replace(/\s+/g, " "),
      description: message.message,
      deviceInfo: "Website contact form",
      appVersion: "N/A",
      userRole: profile?.currentType ?? role,
      status: "open",
      source: "WEBSITE",
      reporterName: message.name,
      createdBy: admin._id,
    });

    await ctx.db.patch(id, {
      feedbackReportId: reportId,
      status: "HANDLED",
      handledBy: admin._id,
      handledAt: Date.now(),
    });
    return { reportId };
  },
});

export const assign = mutation({
  args: {
    id: v.id("contactMessages"),
    ownerId: v.union(v.id("profiles"), v.null()),
  },
  handler: async (ctx, { id, ownerId }) => {
    const admin = await requireAccessProfile(ctx, "messages");
    const message = await ctx.db.get(id);
    if (!message) throwAppError("Message not found.");

    await ctx.db.patch(id, { ownerId: ownerId ?? undefined });

    if (ownerId === null && message.ownerId) {
      await alertAdmins(ctx, [
        `✉️ WEBSITE MESSAGE UNASSIGNED`,
        `📌 ${message.name} (${message.topic})`,
        `✍️ By: ${profileName(admin)}`,
      ]);
    }

    await notifyAssigned(ctx, {
      previousOwnerId: message.ownerId,
      ownerId,
      actor: admin,
      kind: "website message",
      title: `${message.name} (${message.topic}): ${message.message.slice(0, 80)}`,
      path: "/dashboard/messages",
    });

    return { success: true };
  },
});
