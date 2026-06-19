import { Doc } from "@convex/_generated/dataModel";

// Define a type for the Stripe error shape you expect
export type StripeError = {
    code?: string;
    statusCode?: number;
};

export interface ServicesType extends Doc<"services"> {}

export type CreativeEarningCalcType = {
    proposedTotal: number;
    platformClientFeeAmount: number;
    platformCreativeFeeAmount: number;
};
