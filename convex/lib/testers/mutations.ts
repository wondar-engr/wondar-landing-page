import { internal } from "@convex/_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

const TOTAL_CAP = 100;

export const register = mutation({
    args: {
        firstName: v.string(),
        lastName: v.string(),
        email: v.string(),
        phone: v.string(),
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

        // Deduplicate by phone number
        const existingByPhone = await ctx.db
            .query("testers")
            .withIndex("by_phone", q => q.eq("phone", args.phone))
            .unique();

        if (existingByPhone) return { success: true, alreadyRegistered: true };

        if (existing) return { success: true, alreadyRegistered: true };

        // Hard cap check
        const all = await ctx.db.query("testers").collect();
        const active = all.filter(t => t.status !== "rejected");

        if (active.length >= TOTAL_CAP) {
            return { success: false, atCapacity: true };
        }

        await ctx.db.insert("testers", {
            ...args,
            status: "pending",
            updatedAt: Date.now(),
        });

        // Confirmation email
        await ctx.scheduler.runAfter(0, internal.email.sendTesterConfirmation, {
            firstName: args.firstName,
            email: args.email,
            primaryRole: args.primaryRole,
            deviceOs: args.deviceOs,
        });

        // Telegram notification
        const total = active.length + 1;
        const clients =
            all.filter(
                t => t.status !== "rejected" && t.primaryRole === "CLIENT",
            ).length + (args.primaryRole === "CLIENT" ? 1 : 0);
        const creatives = total - clients;

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🧪 NEW BETA TESTER REGISTERED`,
                    ``,
                    `👤 Name:    ${args.firstName} ${args.lastName}`,
                    `📧 Email:   ${args.email}`,
                    `📱 Phone:   ${args.phone}`,
                    `🏙 City:    ${args.city}`,
                    `🎭 Role:    ${args.primaryRole}`,
                    `📲 Device:  ${args.deviceOs}`,
                    ``,
                    `📊 Capacity: ${total}/${TOTAL_CAP} total`,
                    `   Clients:   ${clients} | Creatives: ${creatives}`,
                ].join("\n"),
                category: "ACCOUNTS",
            },
        );

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

// Called from databaseHook — marks tester as registered when they sign up on app
export const markTesterRegistered = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const tester = await ctx.db
            .query("testers")
            .withIndex("by_email", q => q.eq("email", args.email))
            .unique();

        if (!tester || tester.status === "rejected") return;
        if (tester.status === "registered") return;

        await ctx.db.patch(tester._id, {
            status: "registered",
            updatedAt: Date.now(),
        });
    },
});
