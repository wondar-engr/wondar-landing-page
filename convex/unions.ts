import { v } from "convex/values";

export const UserTypeUnion = v.union(
    v.literal("CLIENT"),
    v.literal("CREATIVE"),
);

export const UserRoleUnion = v.union(v.literal("ADMIN"), v.literal("USER"));

export const AccountStatusUnion = v.union(
    v.literal("ACTIVE"),
    v.literal("SUSPENDED"),
    v.literal("PENDING"),
    v.literal("REJECTED"),
);

export const PlatformDeviceUnion = v.union(
    v.literal("IOS"),
    v.literal("ANDROID"),
    v.literal("WEB"),
    v.literal("UNKNOWN"),
);

export const SuspensionStatusUnion = v.union(
    v.literal("ACTIVE"),
    v.literal("EXPIRED"),
    v.literal("REVOKED"),
);

export const MediaTypeUnion = v.union(
    v.literal("IMAGE"),
    v.literal("VIDEO"),
    v.literal("AUDIO"),
    v.literal("DOCUMENT"),
);

export const NotificationTypeUnion = v.union(
    v.literal("MESSAGE"),
    v.literal("BOOKING"),
    v.literal("GENERAL"),
    v.literal("ADMIN"),
    v.literal("REVIEW"),
    v.literal("PAYMENT"),
);

export const ServicePaymentSystemUnion = v.union(
    v.literal("HOURLY"),
    v.literal("FLAT"),
);

export const ServiceDurationUnitUnion = v.union(
    v.literal("MINUTES"),
    v.literal("HOURS"),
    v.literal("DAYS"),
);

export const BookingStatusUnion = v.union(
    v.literal("PENDING"), // Client created, waiting for creative to accept/decline
    v.literal("CONFIRMED"), // Creative accepted, waiting for service date/time
    v.literal("PAID"), // Client paid, waiting for service date
    v.literal("IN_PROGRESS"), // Service is happening (auto or manual)
    v.literal("COMPLETED"), // Service done (auto or manual)
    v.literal("CANCELLED"), // Cancelled by client, creative, or system
    v.literal("DISPUTE"), // Problem raised by either party
    v.literal("REFUNDED"), // Payment refunded
);

export const BookingCompletionDocUnion = v.union(
    v.literal("PHOTO"),
    v.literal("VIDEO"),
    v.literal("DOCUMENT"),
);

export const PaymentStatusUnion = v.union(
    v.literal("PENDING"),
    v.literal("SUCCESS"),
    v.literal("FAILED"),
    v.literal("REFUNDED"),
);

export const ReviewRoleUnion = v.union(
    v.literal("CLIENT"),
    v.literal("CREATIVE"),
);

export const PermissionStatusUnion = v.union(
    v.literal("GRANTED"),
    v.literal("DENIED"),
    v.literal("UNDETERMINED"),
);

export const ServiceStatusUnion = v.union(
    v.literal("ACTIVE"), // Active
    v.literal("INACTIVE"), // Inactive
    v.literal("DRAFT"), // Draft (not published)
);

export const ServiceTravelOptionUnion = v.union(
    v.literal("NO_TRAVEL"), // Client must come to creative
    v.literal("CREATIVE_TRAVELS"), // Creative goes to client
    v.literal("BOTH"), // Either works
);

export const StripeAccountStatusUnion = v.union(
    v.literal("PENDING"),
    v.literal("ACTIVE"),
    v.literal("RESTRICTED"),
    v.literal("DISABLED"),
);

export const SystemConfigCategoryUnion = v.union(
    v.literal("PAYMENTS"),
    v.literal("FEES"),
    v.literal("BOOKINGS"),
    v.literal("NOTIFICATIONS"),
    v.literal("GENERAL"),
);

export const StripeAccountTypeUnion = v.union(
    v.literal("STANDARD"),
    v.literal("EXPRESS"),
    v.literal("CUSTOM"),
);

export const StripePaymentScheduleIntervalUnion = v.union(
    v.literal("DAILY"),
    v.literal("WEEKLY"),
    v.literal("MONTHLY"),
    v.literal("MANUAL"),
);

export const TransactionStatusUnion = v.union(
    v.literal("PENDING"), // Payment intent created
    v.literal("PROCESSING"), // Payment in progress
    v.literal("SUCCEEDED"), // Payment completed
    v.literal("FAILED"), // Payment failed
    v.literal("REFUNDED"), // Fully refunded
    v.literal("PARTIALLY_REFUNDED"), // Partially refunded
);

export const PayoutStatusUnion = v.union(
    v.literal("PENDING"), // Payout scheduled but not yet initiated
    v.literal("IN_TRANSIT"), // Payout sent to bank, in transit
    v.literal("PAID"), // Payout completed and funds received
    v.literal("FAILED"), // Payout failed to process
    v.literal("CANCELED"), // Payout canceled before processing
);

export const PayoutTypeUnion = v.union(
    v.literal("AUTOMATIC"), // Scheduled payout based on schedule
    v.literal("MANUAL"), // Requested by creative
);

export const RefundReasonUnion = v.union(
    v.literal("CLIENT_REQUESTED"), // Client requested refund
    v.literal("CREATIVE_CANCELED"), // Creative canceled the booking
    v.literal("NO_SHOW"), // No show by client or creative
    v.literal("SERVICE_ISSUE"), // Issue with the service provided
    v.literal("DUPLICATE"), // Duplicate transaction or booking
    v.literal("FRAUDULENT"), // Fraudulent activity detected
    v.literal("OTHER"), // Other reasons
);

export const RefundStatusUnion = v.union(
    v.literal("PENDING"), // Refund requested but not yet processed
    v.literal("SUCCEEDED"), // Refund completed successfully
    v.literal("FAILED"), // Refund failed to process
    v.literal("CANCELED"), // Refund canceled before processing
);

export const RefundInitiatedByUnion = v.union(
    v.literal("CLIENT"), // Refund initiated by client
    v.literal("CREATIVE"), // Refund initiated by creative
    v.literal("ADMIN"), // Refund initiated by admin/support
    v.literal("SYSTEM"), // Refund initiated automatically by system (e.g. no-show)
);

export const WaitlistStatusUnion = v.union(
    v.literal("PENDING"),
    v.literal("INVITED"),
    v.literal("JOINED"),
    v.literal("UNSUBSCRIBED"),
);

export const WaitlistInterestUnion = v.union(
    v.literal("CLIENT"),
    v.literal("CREATIVE"),
    v.literal("BOTH"),
);
