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

export default crons;
