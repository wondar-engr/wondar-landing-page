import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const args = { email: v.string(), firstName: v.optional(v.string()) };

export const sendTestWelcome = internalMutation({
    args,
    handler: async (ctx, { email, firstName }) => {
        await ctx.scheduler.runAfter(0, internal.email.sendBigTenWelcome, {
            email: email.trim().toLowerCase(),
            firstName,
        });
    },
});

export const sendTestGuide = internalMutation({
    args,
    handler: async (ctx, { email, firstName }) => {
        await ctx.scheduler.runAfter(0, internal.email.sendBigTenGuide, {
            email: email.trim().toLowerCase(),
            firstName,
        });
    },
});
