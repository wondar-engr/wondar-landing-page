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

/**
 * Everything about a charge's fee that helps explain a number, for debugging
 * the ledger. Used by scripts/platformLedger:reconcile with inspect: true.
 */
export async function inspectChargeFee(stripeChargeId: string) {
    const charge = await getStripe().charges.retrieve(stripeChargeId, {
        expand: ["balance_transaction"],
    });

    const bt = charge.balance_transaction;
    const balanceTransaction =
        bt && typeof bt !== "string"
            ? {
                  id: bt.id,
                  type: bt.type,
                  amount: bt.amount,
                  fee: bt.fee,
                  net: bt.net,
                  currency: bt.currency,
                  feeDetails: bt.fee_details.map(d => ({
                      type: d.type,
                      amount: d.amount,
                      description: d.description,
                  })),
              }
            : (bt ?? null);

    return {
        chargeAmount: charge.amount,
        status: charge.status,
        applicationFee: charge.application_fee_amount ?? null,
        onBehalfOf: charge.on_behalf_of
            ? typeof charge.on_behalf_of === "string"
                ? charge.on_behalf_of
                : charge.on_behalf_of.id
            : null,
        balanceTransaction,
    };
}
