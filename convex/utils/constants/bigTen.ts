// Wondar Big Ten pilot settings
// Keep the end date label on /dashboard/big-ten in step with PILOT_END_DATE.

// Last day the daily check-in reminder goes out (US Central date)
export const PILOT_END_DATE = "2026-11-14";

// The reminder goes out at 6 PM US Central. The cron fires at both possible
// UTC hours (daylight and standard time) and only the matching one proceeds.
export const REMINDER_TIME_ZONE = "America/Chicago";
export const REMINDER_HOUR = 18;

// The end-of-day report to Telegram goes out at 11 PM US Central
export const SUMMARY_HOUR = 23;

// Don't remind the same person twice in a day, even if the cron fires twice
export const MIN_REMINDER_GAP_MS = 20 * 60 * 60 * 1000;

// Resend allows about 2 requests a second
export const EMAIL_GAP_MS = 1500;
