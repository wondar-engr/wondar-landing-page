import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import {
    requireAccessProfile,
    getAuthUserProfile,
} from "@convex/utils/helpers/auth";
import { hasAccess } from "@convex/utils/access";

const statusValidator = v.union(
    v.literal("NEW"),
    v.literal("HANDLED"),
    v.literal("ARCHIVED"),
);

export const list = query({
    args: { status: v.optional(statusValidator) },
    handler: async (ctx, { status }) => {
        await requireAccessProfile(ctx, "messages");

        const base = status
            ? ctx.db
                  .query("contactMessages")
                  .withIndex("by_status", q => q.eq("status", status))
            : ctx.db.query("contactMessages");
        return await base.order("desc").collect();
    },
});

// For the sidebar badge
export const newCount = query({
    args: {},
    handler: async ctx => {
        const me = await getAuthUserProfile(ctx);
        if (!me || !hasAccess(me.role, "messages")) return 0;
        return (
            await ctx.db
                .query("contactMessages")
                .withIndex("by_status", q => q.eq("status", "NEW"))
                .collect()
        ).length;
    },
});
