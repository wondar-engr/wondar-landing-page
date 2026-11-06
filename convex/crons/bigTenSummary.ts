import { internalMutation, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { loadAppStatus } from "../utils/helpers/bigTen";
import {
    PILOT_END_DATE,
    REMINDER_TIME_ZONE,
    SUMMARY_HOUR,
} from "../utils/constants/bigTen";
import { zonedDateAndHour } from "../utils/time";

/**
 * End-of-day Big Ten report to Telegram: where every tester stands, plus the
 * names that still need a nudge. Runs through the last day of the pilot.
 *
 * The cron fires at both UTC hours that can be 11 PM Central (daylight and
 * standard time); only the matching one sends. To send one now, run
 * scripts/bigTen:sendSummaryNow.
 */
export const sendDailySummary = internalMutation({
    args: {},
    handler: async ctx => runSummary(ctx, false),
});

export async function runSummary(ctx: MutationCtx, force: boolean) {
    const clock = zonedDateAndHour(REMINDER_TIME_ZONE);
    if (!force) {
        if (clock.hour !== SUMMARY_HOUR) return { skipped: "not 11 PM" };
        if (clock.date > PILOT_END_DATE) return { skipped: "pilot ended" };
    }

    const testers = await ctx.db.query("bigTenTesters").collect();
    if (testers.length === 0) return { skipped: "no testers" };

    const rows = await Promise.all(
        testers.map(async t => ({
            tester: t,
            app: await loadAppStatus(ctx, t),
        })),
    );

    const total = rows.length;
    const creatives = rows.filter(r => r.tester.role === "CREATIVE");
    const count = (
        list: typeof rows,
        fn: (r: (typeof rows)[number]) => boolean,
    ) => list.filter(fn).length;

    const reportsAll = await ctx.db.query("feedbackReports").collect();
    const emails = new Set(testers.map(t => t.email));
    const testerReports = reportsAll.filter(r => emails.has(r.email));

    const sinceMs = Date.now() - 12 * 60 * 60 * 1000;
    const remindersToday = (
        await ctx.db
            .query("bigTenMessages")
            .filter(q => q.eq(q.field("kind"), "DAILY_REMINDER"))
            .collect()
    ).filter(m => m.channel === "EMAIL" && m._creationTime > sinceMs).length;

    const names = (list: typeof rows) =>
        list.length === 0
            ? "none"
            : list.map(r => r.tester.firstName).join(", ");

    const notSignedUp = rows.filter(r => !r.app.accountCreated);
    const noReports = rows.filter(
        r => r.app.accountCreated && r.app.reportCount === 0,
    );
    const failed = rows.filter(r =>
        Object.values(r.tester.results).includes("FAIL"),
    );
    const passedAll = rows.filter(r =>
        Object.values(r.tester.results).every(v => v === "PASS"),
    );

    const lines = [
        `📊 BIG TEN DAILY REPORT (${clock.date})`,
        ``,
        `👥 Testers: ${total} selected · ${count(rows, r => r.tester.confirmed)} confirmed · ${count(rows, r => r.tester.readyToTest)} ready to test`,
        `✉️ Emails: welcome sent to ${count(rows, r => !!r.tester.welcomeSentAt)}/${total} · guide sent to ${count(rows, r => !!r.tester.guideSentAt)}/${total}`,
        ``,
        `📱 In the app`,
        `• Signed up: ${count(rows, r => r.app.accountCreated)}/${total}`,
        `• Onboarded: ${count(rows, r => r.app.onboarded)}/${total}`,
        `• Opened the app: ${count(rows, r => r.app.lastSeen !== null)}/${total}`,
        `• Creatives with a published service: ${count(creatives, r => r.app.services.length > 0)}/${creatives.length}`,
        `• $5 pilot service live: ${count(creatives, r => r.app.services.some(s => s.serviceFee === 500))}/${creatives.length}`,
        ``,
        `🐞 Feedback`,
        `• Reports from testers: ${testerReports.length} (${testerReports.filter(r => r.type === "BUG").length} bugs, ${testerReports.filter(r => r.type === "FEATURE").length} ideas)`,
        `• Open: ${testerReports.filter(r => r.status === "open" || r.status === "reviewed").length} · resolved/closed: ${testerReports.filter(r => r.status === "resolved" || r.status === "closed").length}`,
        `• Testers who have reported: ${count(rows, r => r.app.reportCount > 0)}/${total}`,
        ``,
        `✅ Workflow results: ${passedAll.length} passed all four · ${failed.length} with a failure`,
        `🔔 Reminders sent tonight: ${remindersToday}`,
        ``,
        `Not signed up yet: ${names(notSignedUp)}`,
        `Signed up, no report yet: ${names(noReports)}`,
    ];

    await ctx.scheduler.runAfter(
        0,
        internal.lib.appActions.notifications.sendTelegramNotification,
        { text: lines.join("\n"), category: "GENERAL" },
    );

    return { sent: true, total };
}
