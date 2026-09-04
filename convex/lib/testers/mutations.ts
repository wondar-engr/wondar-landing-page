import { internal } from "@convex/_generated/api";
import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

export const register = mutation({
    args: {
        firstName: v.string(),
        lastName: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        city: v.string(),
        primaryRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
        deviceOs: v.union(
            v.literal("IOS"),
            v.literal("ANDROID"),
            v.literal("BOTH"),
        ),
    },
    handler: async (ctx, args) => {
        // Deduplicate by email
        const existing = await ctx.db
            .query("testers")
            .withIndex("by_email", q => q.eq("email", args.email))
            .unique();

        if (existing) return { success: true, alreadyRegistered: true };

        await ctx.db.insert("testers", {
            ...args,
            status: "pending",
            deviceOs: args.deviceOs,
            updatedAt: Date.now(),
        });

        await ctx.scheduler.runAfter(0, internal.email.sendTesterConfirmation, {
            firstName: args.firstName,
            email: args.email,
            primaryRole: args.primaryRole,
            deviceOs: args.deviceOs,
        });

        return { success: true, alreadyRegistered: false };
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("testers"),
        status: v.union(
            v.literal("pending"),
            v.literal("added"),
            v.literal("contacted"),
        ),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);
        const tester = await ctx.db.get(args.id);
        if (!tester) return;

        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });

        // Fire welcome email when admin marks as "added"
        if (args.status === "added" && tester.status !== "added") {
            await ctx.scheduler.runAfter(0, internal.email.sendTesterWelcome, {
                firstName: tester.firstName,
                email: tester.email,
                primaryRole: tester.primaryRole,
                deviceOs: tester.deviceOs,
            });
        }
    },
});
