import Stripe from "stripe";
import { getStripe } from "./index";

/**
 * What Stripe charged the platform to process a charge, in cents.
 * Read from the charge's balance transaction, so it is the real figure
 * rather than an estimate.
 */
export async function getChargeProcessingFee(
    stripeChargeId: string,
): Promise<number | null> {
    const charge = await getStripe().charges.retrieve(stripeChargeId, {
        expand: ["balance_transaction"],
    });

    const balanceTransaction = charge.balance_transaction;
    if (!balanceTransaction || typeof balanceTransaction === "string") {
        return null;
    }

    return (balanceTransaction as Stripe.BalanceTransaction).fee;
}
