import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { TesterStatusUnion } from "../../../unions";
import { internal } from "../../../_generated/api";
import { requireAdminProfile } from "../../../utils/helpers/auth";

export const updateStatus = mutation({
    args: {
        id: v.id("testers"),
        status: TesterStatusUnion,
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);
        const tester = await ctx.db.get(args.id);
        if (!tester) return;

        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });

        // Welcome email on "added"
        if (args.status === "added" && tester.status !== "added") {
            await ctx.scheduler.runAfter(0, internal.email.sendTesterWelcome, {
                firstName: tester.firstName,
                email: tester.email,
                primaryRole: tester.primaryRole,
                deviceOs: tester.deviceOs,
            });
        }

        // Rejection email on "rejected"
        if (args.status === "rejected" && tester.status !== "rejected") {
            await ctx.scheduler.runAfter(
                0,
                internal.email.sendTesterRejection,
                {
                    firstName: tester.firstName,
                    email: tester.email,
                },
            );
        }
    },
});
