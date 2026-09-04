import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { query } from "../../../_generated/server";
import { v } from "convex/values";

export const listAll = query({
    args: {
        status: v.optional(v.string()),
        role: v.optional(v.string()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);
        let testers = await ctx.db.query("testers").order("desc").collect();

        if (args.status && args.status !== "ALL") {
            testers = testers.filter(t => t.status === args.status);
        }
        if (args.role && args.role !== "ALL") {
            testers = testers.filter(t => t.primaryRole === args.role);
        }
        if (args.search) {
            const q = args.search.toLowerCase();
            testers = testers.filter(
                t =>
                    `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
                    t.email.toLowerCase().includes(q),
            );
        }

        return testers;
    },
});

export const getStats = query({
    handler: async ctx => {
        await requireAdminProfile(ctx);
        const all = await ctx.db.query("testers").collect();
        const active = all.filter(t => t.status !== "rejected");
        return {
            total: all.length,
            active: active.length,
            pending: all.filter(t => t.status === "pending").length,
            added: all.filter(t => t.status === "added").length,
            registered: all.filter(t => t.status === "registered").length,
            rejected: all.filter(t => t.status === "rejected").length,
            clients: active.filter(t => t.primaryRole === "CLIENT").length,
            creatives: active.filter(t => t.primaryRole === "CREATIVE").length,
            capacityPct: Math.round((active.length / 100) * 100),
        };
    },
});
