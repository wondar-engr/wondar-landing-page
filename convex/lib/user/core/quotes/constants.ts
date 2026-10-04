export const QUOTE_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export const QUOTE_REMINDER_BEFORE_MS = 6 * 60 * 60 * 1000; // 6 hours before deadline
export const DECLINE_REASONS = [
    "Payment too low",
    "Not available that day",
    "Not interested in this opportunity",
    "Other",
] as const;
