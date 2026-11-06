import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import { internal } from "../../../_generated/api";

// Contact form on the website, for people who can't get into the app to use
// the in-app bug report. Shows up in the admin Feedback list as "Website".

const MAX_TITLE = 150;
const MAX_MESSAGE = 4000;
const MAX_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

export const submitReport = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        type: v.union(v.literal("BUG"), v.literal("FEATURE")),
        role: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
        title: v.string(),
        message: v.string(),
        screenshots: v.optional(v.array(v.string())),
        website: v.optional(v.string()), // hidden field; only bots fill it in
    },
    handler: async (ctx, args) => {
        // Bots get a success message and nothing is saved
        if (args.website) return { success: true, error: null };

        const name = args.name.trim();
        const email = args.email.trim().toLowerCase();
        const title = args.title.trim();
        const message = args.message.trim();

        if (!name)
            return { success: false, error: "Please tell us your name." };
        if (!/^\S+@\S+\.\S+$/.test(email))
            return { success: false, error: "Enter a valid email address." };
        if (!title) return { success: false, error: "Add a short title." };
        if (!message)
            return { success: false, error: "Tell us what happened." };
        if (title.length > MAX_TITLE || message.length > MAX_MESSAGE)
            return { success: false, error: "That message is too long." };

        // A few per hour per email, so the form can't be used to spam us
        const recent = (
            await ctx.db
                .query("feedbackReports")
                .withIndex("by_email", q => q.eq("email", email))
                .collect()
        ).filter(
            r =>
                r.source === "WEBSITE" &&
                r._creationTime > Date.now() - HOUR_MS,
        );
        if (recent.length >= MAX_PER_HOUR) {
            return {
                success: false,
                error: "You've sent a few already. We'll get back to you soon.",
            };
        }

        // Only images uploaded through the website form, and only a few
        const screenshots = (args.screenshots ?? [])
            .filter(
                u => u.startsWith("https://") && u.includes("/feedback-web/"),
            )
            .slice(0, 3);

        // Ties the report to their account when they have one
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_email", q => q.eq("email", email))
            .first();

        await ctx.db.insert("feedbackReports", {
            userId: profile?.userId ?? `external:${email}`,
            email,
            type: args.type,
            title,
            description: message,
            screenshotUrl: screenshots[0],
            screenshots: screenshots.length ? screenshots : undefined,
            deviceInfo: "Website contact form",
            appVersion: "N/A",
            userRole: profile?.currentType ?? args.role,
            status: "open",
            source: "WEBSITE",
            reporterName: name,
        });

        // Let them know it arrived
        await ctx.scheduler.runAfter(0, internal.email.sendReportReceived, {
            email,
            name,
            title,
            isIdea: args.type === "FEATURE",
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🌐 NEW WEBSITE REPORT (${args.type === "BUG" ? "bug" : "idea"})`,
                    ``,
                    `👤 ${name} <${email}>`,
                    `📝 ${title}`,
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
