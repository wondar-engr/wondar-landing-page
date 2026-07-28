import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";

const CREATIVE_CANCEL_LIMIT = 3;
const CLIENT_CANCEL_LIMIT = 5;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function checkAndFlagCancellations(
    ctx: MutationCtx,
    userId: string,
    role: "CLIENT" | "CREATIVE",
    bookingOrderNo: string,
) {
    const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();

    if (!profile) return;

    const windowStart = Date.now() - WINDOW_MS;
    const limit =
        role === "CREATIVE" ? CREATIVE_CANCEL_LIMIT : CLIENT_CANCEL_LIMIT;

    // Count recent cancellations from bookings
    const recentCancellations = await ctx.db
        .query("bookings")
        .withIndex(role === "CREATIVE" ? "by_creative" : "by_client", q =>
            q.eq(role === "CREATIVE" ? "creativeId" : "clientId", userId),
        )
        .filter(q =>
            q.and(
                q.eq(q.field("status"), "CANCELLED"),
                q.gte(q.field("updatedAt"), windowStart),
            ),
        )
        .collect();

    const count = recentCancellations.length;

    if (count >= limit) {
        // Already flagged — just update count
        await ctx.db.patch(profile._id, {
            cancellationFlag: {
                flaggedAt: profile.cancellationFlag?.flaggedAt ?? Date.now(),
                count,
                lastCancelledAt: Date.now(),
                role,
            },
        });

        // Telegram alert
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🚨 CANCELLATION FLAG`,
                    ``,
                    `👤 User ID: ${userId}`,
                    `🎭 Role: ${role}`,
                    `📋 Booking: #${bookingOrderNo}`,
                    `🔢 Cancellations (30 days): ${count}`,
                    `⚠️ Threshold: ${limit}`,
                    ``,
                    `Review this account in the admin dashboard.`,
                ].join("\n"),
                category: "DISPUTES",
            },
        );
    }
}
