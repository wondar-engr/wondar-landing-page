import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
    if (stripeInstance) {
        return stripeInstance;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not set");
    }

    stripeInstance = new Stripe(secretKey, {
        apiVersion: "2026-03-25.dahlia",
    });

    return stripeInstance;
};

// Re-export Stripe type for convenience
export type { Stripe };
