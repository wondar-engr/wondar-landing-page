/**
 * Convex-side time utilities.
 * These run in the Convex backend (Node.js / V8 isolate).
 * Do NOT import from @/utils/time — that's the mobile app.
 *
 * Rule: all booking times use clientTimezone as the source of truth.
 * startTime/endTime are minutes from midnight IN clientTimezone.
 * dateBooked is always UTC midnight.
 */

// ─────────────────────────────────────────────────────────────────
// CORE OFFSET MATH
// ─────────────────────────────────────────────────────────────────

/**
 * Get the UTC offset in ms for a timezone at a given UTC timestamp.
 * Accounts for DST — uses the actual offset on that date.
 *
 * Positive = ahead of UTC  (Lagos WAT  = +1hr  = +3_600_000)
 * Negative = behind UTC    (Chicago CDT = -5hr = -18_000_000)
 */
export function getTimezoneOffsetMs(utcMs: number, timezone: string): number {
    try {
        // Format the UTC instant as local time in the target timezone
        const localStr = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(new Date(utcMs));

        // en-CA gives "YYYY-MM-DD, HH:mm:ss" — parse as UTC to get "local ms"
        const normalised = localStr.replace(", ", "T") + "Z";
        const localMs = new Date(normalised).getTime();

        return localMs - utcMs;
    } catch {
        return 0; // Fallback: treat as UTC
    }
}

// ─────────────────────────────────────────────────────────────────
// BOOKING TIMESTAMP MATH
// ─────────────────────────────────────────────────────────────────

/**
 * Convert startTime (minutes from midnight in clientTimezone)
 * to an absolute UTC timestamp.
 *
 * This is the correct way to compare booking times to Date.now().
 *
 * Example:
 *   dateBooked     = Jul 9 2026 00:00:00 UTC
 *   startTime      = 420  (7:00 AM)
 *   clientTimezone = "America/Chicago" (CDT = UTC-5)
 *
 *   offset = -18_000_000 (CDT is 5hrs behind UTC)
 *   result = dateBooked - (-18_000_000) + 420*60*1000
 *          = dateBooked + 18_000_000 + 25_200_000
 *          = Jul 9 12:00:00 UTC  ✅  (7:00 AM CDT = 12:00 PM UTC)
 */
export function bookingStartToUtcMs(
    dateBooked: number,
    startTime: number,
    clientTimezone: string,
): number {
    const offsetMs = getTimezoneOffsetMs(dateBooked, clientTimezone);
    return dateBooked - offsetMs + startTime * 60 * 1000;
}

export function bookingEndToUtcMs(
    dateBooked: number,
    endTime: number,
    clientTimezone: string,
): number {
    const offsetMs = getTimezoneOffsetMs(dateBooked, clientTimezone);
    return dateBooked - offsetMs + endTime * 60 * 1000;
}

// ─────────────────────────────────────────────────────────────────
// DISPLAY / FORMATTING  (for Telegram messages, notifications, logs)
// ─────────────────────────────────────────────────────────────────

/**
 * Format minutes-from-midnight as a 12hr time string.
 * e.g. 420 → "7:00 AM",  630 → "10:30 AM"
 */
export function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format a UTC midnight timestamp as a readable date string.
 * Uses UTC date parts so it's timezone-safe.
 * e.g. 1783044000000 → "Thu, Jul 9, 2026"
 */
export function formatBookingDate(dateBooked: number): string {
    return new Date(dateBooked).toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/**
 * Format the time window for a booking in the client's timezone.
 * Used in Telegram messages and notifications.
 *
 * e.g. "7:00 AM - 8:00 AM CDT"
 */
export function formatBookingTimeWindow(
    startTime: number,
    endTime: number,
    clientTimezone: string,
): string {
    const abbr = getTimezoneAbbr(clientTimezone);
    return `${formatMinutes(startTime)} → ${formatMinutes(endTime)} ${abbr}`;
}

// ─────────────────────────────────────────────────────────────────
// TIMEZONE ABBREVIATION
// ─────────────────────────────────────────────────────────────────

const TIMEZONE_ABBR_MAP: Record<string, string> = {
    "Africa/Lagos": "WAT",
    "Africa/Abuja": "WAT",
    "Africa/Accra": "GMT",
    "Africa/Nairobi": "EAT",
    "Africa/Johannesburg": "SAST",
    "Africa/Cairo": "EET",
    "Europe/London": "GMT",
    "Europe/Paris": "CET",
    "Europe/Berlin": "CET",
    "America/New_York": "EST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    "America/Los_Angeles": "PST",
    "Asia/Dubai": "GST",
    "Asia/Kolkata": "IST",
    "Asia/Tokyo": "JST",
    "Asia/Shanghai": "CST",
    "Australia/Sydney": "AEST",
    "Pacific/Auckland": "NZST",
    UTC: "UTC",
};

export function getTimezoneAbbr(timezone: string): string {
    if (TIMEZONE_ABBR_MAP[timezone]) return TIMEZONE_ABBR_MAP[timezone];

    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            timeZoneName: "short",
        }).formatToParts(new Date());

        const abbr = parts.find(p => p.type === "timeZoneName")?.value ?? "";
        return abbr || timezone;
    } catch {
        return timezone;
    }
}

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a booking date is "today" in a given timezone.
 */
export function isBookingToday(dateBooked: number, timezone: string): boolean {
    const nowInZone = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    const bookingInZone = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(dateBooked));

    return nowInZone === bookingInZone;
}

/**
 * Get start of today (UTC midnight) — for DB range queries.
 * Safe to use in Convex queries.
 */
export function utcMidnightToday(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
