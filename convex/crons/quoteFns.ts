import { sendNotification } from "../lib/notifications";
import { internalMutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";
import { QUOTE_REMINDER_BEFORE_MS } from "@convex/lib/user/core/quotes/constants";

export const processQuoteDeadlines = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        const awaitingQuotes = await ctx.db
            .query("quotes")
            .filter(q =>
                q.and(
                    q.neq(q.field("respondBy"), undefined),
                    q.or(
                        q.eq(q.field("status"), "PENDING"),
                        q.eq(q.field("status"), "CREATIVE_COUNTERED"),
                        q.eq(q.field("status"), "CLIENT_FINAL"),
                    ),
                ),
            )
            .collect();

        for (const quote of awaitingQuotes) {
            if (!quote.respondBy) continue;

            const waitingOnUserId =
                quote.awaitingRole === "CREATIVE"
                    ? quote.creativeId
                    : quote.clientId;
            const otherUserId =
                quote.awaitingRole === "CREATIVE"
                    ? quote.clientId
                    : quote.creativeId;

            // ── Expired ────────────────────────────────────────────
            if (now > quote.respondBy) {
                await ctx.db.patch(quote._id, {
                    status: "EXPIRED",
                    awaitingRole: undefined,
                    updatedAt: now,
                });

                await sendNotification(ctx, {
                    userId: waitingOnUserId,
                    title: "Quote Expired",
                    body: `"${quote.title}" expired — no response within the window.`,
                    type: "GENERAL",
                    meta: { screen: "quote_detail", id: quote._id },
                });

                await sendNotification(ctx, {
                    userId: otherUserId,
                    title: "Quote Expired",
                    body: `"${quote.title}" expired — no response was received in time.`,
                    type: "GENERAL",
                    meta: { screen: "quote_detail", id: quote._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `⏰ QUOTE EXPIRED`,
                            ``,
                            `🆔 Quote ID: ${quote._id}`,
                            `👤 Client:   ${quote.clientId}`,
                            `🎨 Creative: ${quote.creativeId}`,
                            `📌 Title:    ${quote.title}`,
                            `ℹ️ Was awaiting: ${quote.awaitingRole}`,
                        ].join("\n"),
                        category: "BOOKINGS",
                    },
                );

                continue;
            }

            // ── Reminder — final hours ──────────────────────────────
            if (
                quote.respondBy - now <= QUOTE_REMINDER_BEFORE_MS &&
                !quote.reminderSent
            ) {
                await ctx.db.patch(quote._id, { reminderSent: true });

                await sendNotification(ctx, {
                    userId: waitingOnUserId,
                    title: "Quote Waiting for You",
                    body: `"${quote.title}" expires soon — respond before the window closes.`,
                    type: "GENERAL",
                    meta: { screen: "quote_detail", id: quote._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `⏳ QUOTE REMINDER SENT`,
                            ``,
                            `🆔 Quote ID:   ${quote._id}`,
                            `📌 Title:      ${quote.title}`,
                            `👤 Waiting on: ${quote.awaitingRole} (${waitingOnUserId})`,
                        ].join("\n"),
                        category: "BOOKINGS",
                    },
                );
            }
        }
    },
});
