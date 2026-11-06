import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// crons.interval(
//     "process-booking-lifecycle",
//     { minutes: 15 },
//     internal.crons.bookingFns.processBookingLifecycle,
// );

// Runs at :00, :15, :30, :45 every hour — clock aligned
crons.cron(
    "process-booking-lifecycle",
    "*/15 * * * *",
    internal.crons.bookingFns.processBookingLifecycle,
);

crons.cron(
    "process-quote-deadlines",
    "*/15 * * * *",
    internal.crons.quoteFns.processQuoteDeadlines,
);

crons.cron(
    "send-start-reminders",
    "*/5 * * * *",
    internal.crons.bookingReminders.sendStartReminders,
);

crons.cron(
    "process-final-payments",
    "*/10 * * * *",
    internal.crons.bookingReminders.processFinalPayments,
);

crons.cron(
    "send-client-reminders",
    "*/5 * * * *",
    internal.crons.bookingReminders.sendClientReminders,
);

// Catches payouts whose webhook never arrived (stuck PENDING / IN_TRANSIT)
crons.cron(
    "reconcile-open-payouts",
    "0 */6 * * *",
    internal.stripe.payoutReconcile.reconcileOpenPayouts,
);

// Big Ten daily check-in. Fires at both UTC hours that can be 6 PM US Central
// (daylight and standard time); the function only acts at the right one.
crons.cron(
    "big-ten-daily-reminder-cdt",
    "0 23 * * *",
    internal.crons.bigTenReminders.sendDailyReminders,
);
crons.cron(
    "big-ten-daily-reminder-cst",
    "0 0 * * *",
    internal.crons.bigTenReminders.sendDailyReminders,
);

// Big Ten end-of-day Telegram report, 11 PM US Central (same two-hour trick)
crons.cron(
    "big-ten-daily-summary-cdt",
    "0 4 * * *",
    internal.crons.bigTenSummary.sendDailySummary,
);
crons.cron(
    "big-ten-daily-summary-cst",
    "0 5 * * *",
    internal.crons.bigTenSummary.sendDailySummary,
);

export default crons;
