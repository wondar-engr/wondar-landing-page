import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { getAuthUserProfile } from "@convex/utils/helpers/auth";
import { isAdminRole } from "@convex/utils/access";

const typeValidator = v.union(v.literal("BUG"), v.literal("FEATURE"));
const roleValidator = v.union(v.literal("CLIENT"), v.literal("CREATIVE"));
const statusValidator = v.union(
  v.literal("open"),
  v.literal("reviewed"),
  v.literal("resolved"),
  v.literal("closed"),
);

export const list = query({
  args: {
    type: v.optional(typeValidator),
    status: v.optional(statusValidator),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, { type, status, role }) => {
    const admin = await requireAdminProfile(ctx);

    // Use an index for one filter, apply the rest in memory
    const base = status
      ? ctx.db
          .query("feedbackReports")
          .withIndex("by_status", (q) => q.eq("status", status))
      : type
        ? ctx.db
            .query("feedbackReports")
            .withIndex("by_type", (q) => q.eq("type", type))
        : ctx.db.query("feedbackReports");

    const reports = await base.order("desc").collect();

    const filtered = reports.filter(
      (r) =>
        (!status || r.status === status) &&
        (!type || r.type === type) &&
        (!role || r.userRole === role),
    );

    const bigTenEmails = new Set(
      (await ctx.db.query("bigTenTesters").collect()).map((t) => t.email),
    );

    // Comment count, and whether this admin has anything new to read:
    // never opened it, or someone else commented after they last did
    return await Promise.all(
      filtered.map(async (report) => {
        const comments = await ctx.db
          .query("feedbackComments")
          .withIndex("by_reportId", (q) => q.eq("reportId", report._id))
          .collect();
        const read = await ctx.db
          .query("feedbackReads")
          .withIndex("by_profile_report", (q) =>
            q.eq("profileId", admin._id).eq("reportId", report._id),
          )
          .unique();

        const unread =
          !read ||
          comments.some(
            (c) =>
              c.authorId !== admin._id && c._creationTime > read.lastReadAt,
          );

        return {
          ...report,
          commentCount: comments.length,
          unread,
          isBigTen: bigTenEmails.has(report.email.trim().toLowerCase()),
        };
      }),
    );
  },
});

export const getById = query({
  args: { id: v.id("feedbackReports") },
  handler: async (ctx, { id }) => {
    await requireAdminProfile(ctx);

    // null lets the page render "not found" instead of crashing the query
    const report = await ctx.db.get(id);
    if (!report) return null;

    const resolver = report.resolvedBy
      ? await ctx.db.get(report.resolvedBy)
      : null;

    const owner = report.ownerId ? await ctx.db.get(report.ownerId) : null;

    return {
      ...report,
      ownerName: owner
        ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() ||
          owner.email
        : undefined,
      resolvedByName: resolver
        ? `${resolver.firstName ?? ""} ${resolver.lastName ?? ""}`.trim()
        : undefined,
    };
  },
});

export const listComments = query({
  args: { reportId: v.id("feedbackReports") },
  handler: async (ctx, { reportId }) => {
    const admin = await requireAdminProfile(ctx);

    const comments = await ctx.db
      .query("feedbackComments")
      .withIndex("by_reportId", (q) => q.eq("reportId", reportId))
      .order("asc")
      .collect();

    // Admins are few, so look each author up once
    const authors = new Map<string, string>();
    for (const authorId of new Set(comments.map((c) => c.authorId))) {
      const author = await ctx.db.get(authorId);
      authors.set(
        authorId,
        author
          ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() ||
              author.email
          : "Former admin",
      );
    }

    return comments.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      body: c.body,
      authorName: authors.get(c.authorId) ?? "Former admin",
      isMine: c.authorId === admin._id,
    }));
  },
});

// Powers the sidebar badges: new reports this admin hasn't opened yet (open
// ones only), and comments from other admins they haven't seen. Opening a
// report clears both. Quiet for anyone not signed in as an admin, so the
// sidebar can ask without error handling.
export const unreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAuthUserProfile(ctx);
    if (!admin || !isAdminRole(admin.role)) {
      return { newReports: 0, comments: 0 };
    }

    const reads = await ctx.db
      .query("feedbackReads")
      .filter((q) => q.eq(q.field("profileId"), admin._id))
      .collect();
    const lastRead = new Map(reads.map((r) => [r.reportId, r.lastReadAt]));

    const openReports = await ctx.db
      .query("feedbackReports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const newReports = openReports.filter((r) => !lastRead.has(r._id)).length;

    const comments = (await ctx.db.query("feedbackComments").collect()).filter(
      (c) =>
        c.authorId !== admin._id &&
        c._creationTime > (lastRead.get(c.reportId) ?? 0),
    ).length;

    return { newReports, comments };
  },
});

// Find the person a report is about, by name or email
export const searchPeople = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    await requireAdminProfile(ctx);

    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];

    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((p) =>
        `${p.firstName ?? ""} ${p.lastName ?? ""} ${p.email}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 8)
      .map((p) => ({
        _id: p._id,
        name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email,
        email: p.email,
        role: p.currentType,
      }));
  },
});
