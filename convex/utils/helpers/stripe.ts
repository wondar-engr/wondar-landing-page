// ── Shared balance extractor ──────────────────────────────────────
// Stripe returns available: 0 in test mode — use instant_available
// as the spendable balance when available is 0 and instant is set.

import Stripe from "stripe";

// In live mode, available is the real number.
export function extractBalance(balance: Stripe.Balance): {
    availableBalance: number;
    pendingBalance: number;
} {
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    // instant_available exists on the type but isn't always present
    const instantAvailable = ((balance as any).instant_available ?? []).reduce(
        (sum: number, b: { amount: number }) => sum + b.amount,
        0,
    );

    // Use instant_available when standard available is 0 and instant has funds
    // This handles test mode correctly without breaking live mode
    const availableBalance =
        available === 0 && instantAvailable > 0 ? instantAvailable : available;

    return { availableBalance, pendingBalance: pending };
}
