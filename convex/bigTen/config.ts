// Wondar Big Ten pilot settings

// Last day the daily check-in reminder goes out (US Central date)
export const PILOT_END_DATE = "2026-11-14";

// The reminder goes out at 6 PM US Central. The cron fires at both possible
// UTC hours (daylight and standard time) and only the matching one proceeds.
export const REMINDER_TIME_ZONE = "America/Chicago";
export const REMINDER_HOUR = 18;

// Don't remind the same person twice in a day, even if the cron fires twice
export const MIN_REMINDER_GAP_MS = 20 * 60 * 60 * 1000;

// Resend allows about 2 requests a second
export const EMAIL_GAP_MS = 1500;

/** Current date (YYYY-MM-DD) and hour in the reminder time zone. */
export function reminderClock(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: REMINDER_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";

    return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        hour: Number(get("hour")),
    };
}
