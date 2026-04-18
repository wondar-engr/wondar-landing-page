// Define a type for the Stripe error shape you expect
export type StripeError = {
    code?: string;
    statusCode?: number;
};
