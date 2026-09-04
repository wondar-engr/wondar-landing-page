import { requireAdminProfile } from "@convex/utils/helpers/auth";
import { query } from "../../_generated/server";

export const listAll = query({
    handler: async ctx => {
        await requireAdminProfile(ctx);
        return await ctx.db.query("testers").order("desc").collect();
    },
});

export const getStats = query({
    handler: async ctx => {
        await requireAdminProfile(ctx);
        const all = await ctx.db.query("testers").collect();
        return {
            total: all.length,
            pending: all.filter(t => t.status === "pending").length,
            added: all.filter(t => t.status === "added").length,
            clients: all.filter(t => t.primaryRole === "CLIENT").length,
            creatives: all.filter(t => t.primaryRole === "CREATIVE").length,
        };
    },
});
