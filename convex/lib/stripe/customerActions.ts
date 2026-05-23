"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../auth";
import { getStripe } from "./index";
import { internal } from "../../_generated/api";

type PaymentMethodResult = {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
};

type ListPaymentMethodsResult = {
    paymentMethods: PaymentMethodResult[];
    defaultPaymentMethodId: string | null;
};

// ── List saved payment methods ────────────────────────────────────
export const listPaymentMethods = action({
    args: {},
    handler: async (ctx): Promise<ListPaymentMethodsResult> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const customer = await ctx.runQuery(
            internal.lib.stripe.customerQueries.getCustomerByUserId,
            { userId },
        );

        // No customer yet — return empty, not an error
        if (!customer?.stripeCustomerId) {
            return { paymentMethods: [], defaultPaymentMethodId: null };
        }

        const stripe = getStripe();

        const [pmList, stripeCustomer] = await Promise.all([
            stripe.paymentMethods.list({
                customer: customer.stripeCustomerId,
                type: "card",
            }),
            stripe.customers.retrieve(customer.stripeCustomerId),
        ]);

        const defaultPaymentMethodId =
            !stripeCustomer.deleted &&
            typeof stripeCustomer.invoice_settings?.default_payment_method ===
                "string"
                ? stripeCustomer.invoice_settings.default_payment_method
                : (customer.defaultPaymentMethodId ?? null);

        return {
            paymentMethods: pmList.data.map(pm => ({
                id: pm.id,
                brand: pm.card?.brand ?? "unknown",
                last4: pm.card?.last4 ?? "****",
                expMonth: pm.card?.exp_month ?? 0,
                expYear: pm.card?.exp_year ?? 0,
                isDefault: pm.id === defaultPaymentMethodId,
            })),
            defaultPaymentMethodId,
        };
    },
});

// ── Set default payment method ────────────────────────────────────
export const setDefaultPaymentMethod = action({
    args: { paymentMethodId: v.string() },
    handler: async (ctx, { paymentMethodId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const customer = await ctx.runQuery(
            internal.lib.stripe.customerQueries.getCustomerByUserId,
            { userId },
        );
        if (!customer?.stripeCustomerId) throw new Error("No customer found");

        const stripe = getStripe();

        await stripe.customers.update(customer.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        await ctx.runMutation(
            internal.lib.stripe.customerMutations.updateDefaultPaymentMethod,
            { userId, paymentMethodId },
        );

        return { success: true };
    },
});

// ── Remove payment method ─────────────────────────────────────────
export const removePaymentMethod = action({
    args: { paymentMethodId: v.string() },
    handler: async (ctx, { paymentMethodId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const stripe = getStripe();
        await stripe.paymentMethods.detach(paymentMethodId);

        return { success: true };
    },
});
