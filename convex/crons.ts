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

export default crons;
