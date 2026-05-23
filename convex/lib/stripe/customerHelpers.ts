"use node";

import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getStripe } from "./index";

/**
 * Gets existing Stripe customer ID for a client,
 * or creates one and saves it to DB if it doesn't exist yet.
 */
export async function getOrCreateStripeCustomer(
    ctx: ActionCtx,
    clientId: string,
): Promise<string> {
    // 1. Check if we already have one saved
    const existing = await ctx.runQuery(
        internal.lib.stripe.customerQueries.getCustomerByUserId,
        { userId: clientId },
    );

    if (existing?.stripeCustomerId) {
        return existing.stripeCustomerId;
    }

    // 2. Get client profile to pass email to Stripe
    const profile = await ctx.runQuery(
        internal.lib.internalQueries.profiles.getProfileByUserId,
        { userId: clientId },
    );

    const stripe = getStripe();

    // 3. Create Stripe customer
    const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        name: profile
            ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
            : undefined,
        metadata: {
            userId: clientId,
            platform: "wondar",
        },
    });

    // 4. Save to DB
    await ctx.runMutation(
        internal.lib.stripe.customerMutations.saveStripeCustomer,
        {
            userId: clientId,
            stripeCustomerId: customer.id,
            email: profile?.email ?? undefined,
        },
    );

    return customer.id;
}
