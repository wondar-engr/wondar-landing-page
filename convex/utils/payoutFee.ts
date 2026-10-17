// Pure TS only: imported by both Convex and the app
export const INSTANT_PAYOUT_FEE_RATE = 0.02;
export const INSTANT_PAYOUT_MIN_FEE_CENTS = 50;
export const INSTANT_PAYOUT_FEE_LABEL = "2% fee (min $0.50)";

export const instantPayoutFee = (amountCents: number) =>
    Math.max(
        Math.round(amountCents * INSTANT_PAYOUT_FEE_RATE),
        INSTANT_PAYOUT_MIN_FEE_CENTS,
    );
