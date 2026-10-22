import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";

export const request = mutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const normalized = email.trim().toLowerCase();

        // Check if the email is associated with an existing account
        const account = await ctx.db
            .query("profiles")
            .withIndex("by_email", q => q.eq("email", normalized))
            .first();

        if (!account) {
            return {
                success: false,
                error: "No account found for this email.",
                alreadyRequested: false,
            };
        }

        // Dedupe: one open request per email (also stops email spam)
        const existing = await ctx.db
            .query("deletionRequests")
            .withIndex("by_email", q => q.eq("email", normalized))
            .collect();
        if (
            existing.some(
                r => r.status === "pending" || r.status === "processing",
            )
        ) {
            return { success: true, alreadyRequested: true, error: null };
        }

        await ctx.db.insert("deletionRequests", {
            email: normalized,
            status: "pending",
            updatedAt: Date.now(),
        });

        // Confirmation email to the user
        await ctx.scheduler.runAfter(
            0,
            internal.email.sendDeletionConfirmation,
            {
                email: normalized,
            },
        );

        // Telegram notification to the team
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🗑 ACCOUNT DELETION REQUEST`,
                    ``,
                    `📧 Email: ${normalized}`,
                    ``,
                    `Verify the requester owns this account, then delete within 30 days.`,
                ].join("\n"),
                category: "ACCOUNTS",
            },
        );

        return { success: true, alreadyRequested: false, error: null };
    },
});
