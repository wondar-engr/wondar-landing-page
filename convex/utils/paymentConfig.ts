import { QueryCtx } from "../_generated/server";

export interface PaymentConfig {
    platformFeePercent: number;
    stripeFeeClientShare: number;
    stripeFeeCreativeShare: number;
    minServiceFee: number;
    maxServiceFee: number;
    defaultCurrency: string;
    bookingFeeRefundable: boolean;
    cancellationFullRefundHours: number;
    cancellationPartialRefundHours: number;
    cancellationPartialRefundPercent: number;
    cancellationNoRefundHours: number;
}

/**
 * Get all payment-related configuration
 */
export async function getPaymentConfig(ctx: QueryCtx): Promise<PaymentConfig> {
    const keys = [
        "platform_fee_percent",
        "stripe_fee_split_client",
        "stripe_fee_split_creative",
        "min_service_fee",
        "max_service_fee",
        "default_currency",
        "booking_fee_refundable",
        "cancellation_full_refund_hours",
        "cancellation_partial_refund_hours",
        "cancellation_partial_refund_percent",
        "cancellation_no_refund_hours",
    ];

    const configs: Record<string, unknown> = {};

    for (const key of keys) {
        const config = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", key))
            .unique();

        configs[key] = config?.value;
    }

    return {
        platformFeePercent: (configs["platform_fee_percent"] as number) ?? 15,
        stripeFeeClientShare:
            (configs["stripe_fee_split_client"] as number) ?? 50,
        stripeFeeCreativeShare:
            (configs["stripe_fee_split_creative"] as number) ?? 50,
        minServiceFee: (configs["min_service_fee"] as number) ?? 500,
        maxServiceFee: (configs["max_service_fee"] as number) ?? 1000000,
        defaultCurrency: (configs["default_currency"] as string) ?? "usd",
        bookingFeeRefundable:
            (configs["booking_fee_refundable"] as boolean) ?? false,
        cancellationFullRefundHours:
            (configs["cancellation_full_refund_hours"] as number) ?? 24,
        cancellationPartialRefundHours:
            (configs["cancellation_partial_refund_hours"] as number) ?? 12,
        cancellationPartialRefundPercent:
            (configs["cancellation_partial_refund_percent"] as number) ?? 50,
        cancellationNoRefundHours:
            (configs["cancellation_no_refund_hours"] as number) ?? 6,
    };
}

/**
 * Calculate payment breakdown
 */
export function calculatePaymentBreakdown(
    serviceFee: number,
    bookingFee: number,
    travelFee: number,
    config: PaymentConfig,
) {
    // Subtotal (what the service costs)
    const subtotal = serviceFee + travelFee;

    // Platform fee
    const platformFeeAmount = Math.round(
        subtotal * (config.platformFeePercent / 100),
    );

    // Estimate Stripe fee (2.9% + $0.30)
    // This is calculated on the total charged amount
    const estimatedTotal = subtotal + bookingFee;
    const stripeFeeAmount = Math.round(estimatedTotal * 0.029 + 30);

    // Split Stripe fee
    const clientStripeFeeShare = Math.round(
        stripeFeeAmount * (config.stripeFeeClientShare / 100),
    );
    const creativeStripeFeeShare = stripeFeeAmount - clientStripeFeeShare;

    // Total charged to client
    const totalCharged = subtotal + bookingFee + clientStripeFeeShare;

    // Creative earnings (subtotal - platform fee - their share of Stripe fee)
    const creativeEarnings =
        subtotal - platformFeeAmount - creativeStripeFeeShare;

    // Platform earnings
    const platformEarnings = platformFeeAmount;

    return {
        serviceFee,
        bookingFee,
        travelFee,
        subtotal,
        platformFeePercent: config.platformFeePercent,
        platformFeeAmount,
        stripeFeeAmount,
        clientStripeFeeShare,
        creativeStripeFeeShare,
        totalCharged,
        creativeEarnings,
        platformEarnings,
    };
}

/**
 * Calculate refund amount based on cancellation timing
 */
export function calculateRefundAmount(
    totalPaid: number,
    bookingFee: number,
    hoursUntilBooking: number,
    config: PaymentConfig,
): { refundAmount: number; refundPercent: number; reason: string } {
    const refundableAmount = config.bookingFeeRefundable
        ? totalPaid
        : totalPaid - bookingFee;

    if (hoursUntilBooking >= config.cancellationFullRefundHours) {
        return {
            refundAmount: refundableAmount,
            refundPercent: 100,
            reason: "Full refund - cancelled with sufficient notice",
        };
    }

    if (hoursUntilBooking >= config.cancellationPartialRefundHours) {
        const refundAmount = Math.round(
            refundableAmount * (config.cancellationPartialRefundPercent / 100),
        );
        return {
            refundAmount,
            refundPercent: config.cancellationPartialRefundPercent,
            reason: "Partial refund - cancelled with limited notice",
        };
    }

    if (hoursUntilBooking >= config.cancellationNoRefundHours) {
        return {
            refundAmount: 0,
            refundPercent: 0,
            reason: "No refund - cancelled too close to booking time",
        };
    }

    return {
        refundAmount: 0,
        refundPercent: 0,
        reason: "No refund - booking time has passed or too close",
    };
}
