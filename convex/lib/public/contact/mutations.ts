import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { internal } from "../../../_generated/api";

// Website contact form: a plain message to the team (questions, partnerships,
// anything else). It lands in the admin Messages inbox, not in Feedback.

export const CONTACT_TOPICS = [
    "General question",
    "Support",
    "Partnership",
    "Press",
    "Other",
] as const;

const MAX_MESSAGE = 4000;
const MAX_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

export const submit = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        topic: v.string(),
        message: v.string(),
        website: v.optional(v.string()), // hidden field; only bots fill it in
    },
    handler: async (ctx, args) => {
        // Bots get a success message and nothing is saved
        if (args.website) return { success: true, error: null };

        const name = args.name.trim();
        const email = args.email.trim().toLowerCase();
        const message = args.message.trim();
        const topic = (CONTACT_TOPICS as readonly string[]).includes(args.topic)
            ? args.topic
            : "Other";

        if (!name)
            return { success: false, error: "Please tell us your name." };
        if (!/^\S+@\S+\.\S+$/.test(email))
            return { success: false, error: "Enter a valid email address." };
        if (!message)
            return { success: false, error: "Write us a short message." };
        if (message.length > MAX_MESSAGE)
            return { success: false, error: "That message is too long." };

        // A few per hour per email, so the form can't be used to spam us
        const recent = (
            await ctx.db
                .query("contactMessages")
                .withIndex("by_email", q => q.eq("email", email))
                .collect()
        ).filter(m => m._creationTime > Date.now() - HOUR_MS);
        if (recent.length >= MAX_PER_HOUR) {
            return {
                success: false,
                error: "You've sent a few already. We'll get back to you soon.",
            };
        }

        await ctx.db.insert("contactMessages", {
            name,
            email,
            topic,
            message,
            status: "NEW",
        });

        // Let them know it arrived
        await ctx.scheduler.runAfter(0, internal.email.sendContactReceived, {
            email,
            name,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `✉️ NEW WEBSITE MESSAGE (${topic})`,
                    ``,
                    `👤 ${name} <${email}>`,
                    ``,
                    message.length > 300
                        ? `${message.slice(0, 300)}…`
                        : message,
                ].join("\n"),
                category: "GENERAL",
            },
        );

        return { success: true, error: null };
    },
});
