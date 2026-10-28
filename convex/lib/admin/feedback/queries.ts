import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

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
        await requireAdminProfile(ctx);

        // Use an index for one filter, apply the rest in memory
        const base = status
            ? ctx.db
                  .query("feedbackReports")
                  .withIndex("by_status", q => q.eq("status", status))
            : type
              ? ctx.db
                    .query("feedbackReports")
                    .withIndex("by_type", q => q.eq("type", type))
              : ctx.db.query("feedbackReports");

        const reports = await base.order("desc").collect();

        return reports.filter(
            r =>
                (!status || r.status === status) &&
                (!type || r.type === type) &&
                (!role || r.userRole === role),
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

        return {
            ...report,
            resolvedByName: resolver
                ? `${resolver.firstName ?? ""} ${resolver.lastName ?? ""}`.trim()
                : undefined,
        };
    },
});
