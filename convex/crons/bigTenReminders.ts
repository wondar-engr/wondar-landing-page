import { internalMutation, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendNotification } from "../lib/notifications";
import {
    EMAIL_GAP_MS,
    MIN_REMINDER_GAP_MS,
    PILOT_END_DATE,
    REMINDER_HOUR,
    REMINDER_TIME_ZONE,
} from "../utils/constants/bigTen";
import { zonedDateAndHour } from "../utils/time";
import { isDevDeployment } from "../utils/devMode";

/**
 * Daily check-in for the Big Ten pilot, at 6 PM US Central until the pilot
 * ends. Goes to testers who haven't signed up yet and testers who haven't
 * sent a single report. Anyone who has already reported is left alone.
 *
 * The cron fires at 23:00 and 00:00 UTC; only the one that lands on 6 PM
 * Central does anything, so daylight saving needs no changes here.
 * To send one by hand, run scripts/bigTen:sendRemindersNow.
 */
export const sendDailyReminders = internalMutation({
    args: {},
    handler: async ctx => runReminders(ctx, false),
});

export async function runReminders(ctx: MutationCtx, force: boolean) {
    const clock = zonedDateAndHour(REMINDER_TIME_ZONE);

    if (!force) {
        if (isDevDeployment()) return { skipped: "dev deployment" };
        if (clock.hour !== REMINDER_HOUR) return { skipped: "not 6 PM" };
        if (clock.date > PILOT_END_DATE) return { skipped: "pilot ended" };
    }

    const testers = await ctx.db.query("bigTenTesters").collect();
    const now = Date.now();
    let sent = 0;

    for (const tester of testers) {
        if (tester.remindersMuted) continue;
        if (
            tester.lastReminderAt &&
            now - tester.lastReminderAt < MIN_REMINDER_GAP_MS
        ) {
            continue;
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_email", q => q.eq("email", tester.email))
            .first();

        if (profile) {
            const report = await ctx.db
                .query("feedbackReports")
                .withIndex("by_userId", q => q.eq("userId", profile.userId))
                .first();
            if (report) continue; // already sending us feedback
        }

        const { subject, body } = profile
            ? checkInMessage(tester.role)
            : notJoinedMessage();

        await ctx.scheduler.runAfter(
            sent * EMAIL_GAP_MS,
            internal.email.sendBigTenMessage,
            {
                email: tester.email,
                firstName: tester.firstName,
                subject,
                body,
            },
        );
        await ctx.db.insert("bigTenMessages", {
            testerId: tester._id,
            kind: "DAILY_REMINDER",
            channel: "EMAIL",
            subject,
            body,
        });

        if (profile) {
            const result = await sendNotification(ctx, {
                userId: profile.userId,
                title: subject,
                body: "Tell us what worked and what didn't today.",
                type: "GENERAL",
            });
            if (result.pushSent) {
                await ctx.db.insert("bigTenMessages", {
                    testerId: tester._id,
                    kind: "DAILY_REMINDER",
                    channel: "PUSH",
                    subject,
                    body: "Tell us what worked and what didn't today.",
                });
            }
        }

        await ctx.db.patch(tester._id, { lastReminderAt: now });
        sent++;
    }

    return { sent, checked: testers.length };
}

function checkInMessage(role: "CLIENT" | "CREATIVE") {
    const where =
        role === "CLIENT"
            ? "Help & Support → Report a Bug"
            : "Settings → Report a Bug";

    return {
        subject: "How was your Wondar experience today?",
        body: [
            "How was your experience with Wondar today?",
            `We haven't received a report from you yet. Anything that broke, confused you or felt slow, or any idea you'd like to see, tell us about it from ${where} in the app. Small things count too.`,
            "You can also just reply to this email.",
        ].join("\n\n"),
    };
}

function notJoinedMessage() {
    return {
        subject: "Your Wondar Big Ten spot is waiting",
        body: [
            "We noticed you haven't signed up for Wondar yet.",
            "Download the app and sign up with this email address, so we can link you to the pilot. Your starter guide has the steps if you need them.",
            "Stuck on something? Reply to this email and we'll help.",
        ].join("\n\n"),
    };
}
