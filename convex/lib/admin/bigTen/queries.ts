import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { Doc } from "@convex/_generated/dataModel";
import { requireAccessProfile } from "@convex/utils/helpers/auth";
import { loadAppStatus } from "@convex/utils/helpers/bigTen";

const allPassed = (t: Doc<"bigTenTesters">) =>
  Object.values(t.results).every((r) => r === "PASS");

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAccessProfile(ctx, "bigTen");

    const testers = await ctx.db.query("bigTenTesters").collect();
    const rows = await Promise.all(
      testers.map(async (tester) => ({
        ...tester,
        app: await loadAppStatus(ctx, tester),
      })),
    );
    rows.sort((a, b) => a._creationTime - b._creationTime);

    return {
      testers: rows,
      stats: {
        selected: rows.length,
        confirmed: rows.filter((t) => t.confirmed).length,
        signedUp: rows.filter((t) => t.app.accountCreated).length,
        readyToTest: rows.filter((t) => t.readyToTest).length,
        completed: rows.filter(allPassed).length,
        openIssues: rows.reduce((sum, t) => sum + t.app.openReportCount, 0),
      },
    };
  },
});

export const getById = query({
  args: { id: v.id("bigTenTesters") },
  handler: async (ctx, { id }) => {
    await requireAccessProfile(ctx, "bigTen");

    const tester = await ctx.db.get(id);
    if (!tester) return null;

    const app = await loadAppStatus(ctx, tester);

    // Matched by email, so reports added for someone without an account
    // (or sent from the website) still show up here
    const reports = await ctx.db
      .query("feedbackReports")
      .withIndex("by_email", (q) => q.eq("email", tester.email))
      .order("desc")
      .collect();

    const owner = tester.ownerId ? await ctx.db.get(tester.ownerId) : null;

    return {
      ...tester,
      app,
      ownerName: owner ? fullName(owner) : null,
      reports: reports.map((r) => ({
        _id: r._id,
        _creationTime: r._creationTime,
        title: r.title,
        type: r.type,
        status: r.status,
        severity: r.severity ?? null,
      })),
    };
  },
});

export const listMessages = query({
  args: { testerId: v.id("bigTenTesters") },
  handler: async (ctx, { testerId }) => {
    await requireAccessProfile(ctx, "bigTen");

    const messages = await ctx.db
      .query("bigTenMessages")
      .withIndex("by_testerId", (q) => q.eq("testerId", testerId))
      .order("desc")
      .take(50);

    return await Promise.all(
      messages.map(async (m) => {
        const sender = m.sentBy ? await ctx.db.get(m.sentBy) : null;
        return {
          ...m,
          sentByName: sender ? fullName(sender) : "Automatic",
        };
      }),
    );
  },
});

// Admins who can be set as a tester's follow-up owner
export const listOwners = query({
  args: {},
  handler: async (ctx) => {
    await requireAccessProfile(ctx, "bigTen");

    const admins = [
      ...(await ctx.db
        .query("profiles")
        .withIndex("by_role", (q) => q.eq("role", "ADMIN"))
        .collect()),
      ...(await ctx.db
        .query("profiles")
        .withIndex("by_role", (q) => q.eq("role", "SUPER_ADMIN"))
        .collect()),
    ];
    return admins.map((a) => ({ _id: a._id, name: fullName(a) }));
  },
});

function fullName(p: Doc<"profiles">) {
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email;
}
