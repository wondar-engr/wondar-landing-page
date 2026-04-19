import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
    AccountStatusUnion,
    BookingCompletionDocUnion,
    BookingStatusUnion,
    MediaTypeUnion,
    NotificationTypeUnion,
    PaymentStatusUnion,
    PayoutStatusUnion,
    PayoutTypeUnion,
    PermissionStatusUnion,
    PlatformDeviceUnion,
    RefundInitiatedByUnion,
    RefundReasonUnion,
    RefundStatusUnion,
    ReviewRoleUnion,
    ServicePaymentSystemUnion,
    ServiceStatusUnion,
    ServiceTravelOptionUnion,
    StripeAccountStatusUnion,
    StripePaymentScheduleIntervalUnion,
    SuspensionStatusUnion,
    SystemConfigCategoryUnion,
    TransactionStatusUnion,
    UserTypeUnion,
    UserRoleUnion,
    WaitlistStatusUnion,
    WaitlistInterestUnion,
} from "./unions";

const schema = defineSchema({
    profiles: defineTable({
        userId: v.string(), // BetterAuth ID (Primary Key)
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        email: v.string(),
        phoneNumber: v.optional(v.string()),
        phoneVerified: v.optional(v.boolean()),
        role: UserRoleUnion,
        avatar: v.optional(v.string()),
        currentType: UserTypeUnion, // "client", "creative",
        totalRating: v.optional(v.number()), // Cumulative rating for sorting (e.g., "Top Rated")
        // PUBLIC SEARCH DATA:
        // This is what the map uses. Update this frequently via the mobile app.
        lastKnownLocation: v.optional(
            v.object({
                lat: v.number(),
                lng: v.number(),
                timestamp: v.number(), // Helpful for "Last seen 5 mins ago"
            }),
        ),

        // ONBOARDING STATE
        onboarding: v.object({
            profileComplete: v.boolean(),
            clientComplete: v.boolean(),
            creativeComplete: v.boolean(),
        }),

        permissions: v.optional(
            v.object({
                onboardingComplete: v.boolean(),
                location: PermissionStatusUnion,
                notifications: PermissionStatusUnion,
                gallery: PermissionStatusUnion,
            }),
        ),
        // ACCOUNT HEALTH
        accountStatus: AccountStatusUnion,
        updatedAt: v.optional(v.number()),
        // LAST KNOWN (For "Active Now" indicators, not necessarily map pins)
        lastSeen: v.optional(v.number()), // Timestamp
    }).index("by_userId", ["userId"]),
    // Phone verification codes table
    phoneVerificationCodes: defineTable({
        userId: v.string(), // BetterAuth ID (if we want to link it to a user)
        phoneNumber: v.string(),
        expiresAt: v.number(),
        attempts: v.number(),
        verified: v.boolean(),
    })
        .index("by_phoneNumber", ["phoneNumber"])
        .index("by_expiry", ["expiresAt"]),
    creativeProfiles: defineTable({
        userId: v.string(),
        aboutMe: v.string(),
        businessName: v.string(),
        skills: v.optional(v.array(v.id("serviceCategories"))), // Array of category IDs for better querying
        accountStatus: AccountStatusUnion,

        coverImage: v.string(),
        workAddress: v.object({
            address: v.string(),
            city: v.string(),
            state: v.string(),
            zipCode: v.string(),
            lat: v.number(),
            lng: v.number(),
        }),

        // NEW: Travel preferences
        willingToTravel: v.optional(v.boolean()),
        travelRadius: v.optional(v.number()), // in miles, null = work address only

        // NEW: For "Available Now" feature
        instantBooking: v.optional(v.boolean()),

        // NEW: Aggregated stats for sorting
        stats: v.optional(
            v.object({
                totalBookings: v.number(),
                completedBookings: v.number(),
                averageRating: v.number(),
                totalReviews: v.number(),
                lowestPrice: v.optional(v.number()),
            }),
        ),
        onboardingComplete: v.boolean(),
    })
        .index("by_userId", ["userId"])
        .index("by_location", ["workAddress.lat", "workAddress.lng"])
        .index("by_rating", ["stats.averageRating"]) // For "Top Rated" sorting
        .index("by_bookings", ["stats.completedBookings"]), // For "Popular" sorting, // Crucial for map radius searches,
    clientProfiles: defineTable({
        userId: v.string(),
        companyName: v.optional(v.string()),
        aboutCompany: v.optional(v.string()),
        personalAddress: v.optional(
            v.object({
                address: v.string(),
                city: v.string(),
                state: v.string(),
                zipCode: v.string(),
                lat: v.optional(v.number()), // Home coordinates for routing
                lng: v.optional(v.number()),
            }),
        ),
        accountStatus: AccountStatusUnion,
        favoriteCategories: v.array(v.id("serviceCategories")), // Array of category IDs
        onboardingComplete: v.optional(v.boolean()),
    }).index("by_userId", ["userId"]),
    serviceCategories: defineTable({
        name: v.string(),
        image: v.optional(v.string()),
        status: v.optional(v.boolean()), // For soft-deletion and future "featured" flags
        rank: v.number(), // Lower number = higher priority (1 is top)
    })
        .index("byName", ["name"])
        .index("byRank", ["rank"])
        .index("byStatus", ["status"]),
    userSettings: defineTable({
        userId: v.string(),
        notifications: v.object({
            channels: v.object({ phone: v.boolean(), email: v.boolean() }),
            triggers: v.object({
                booking: v.boolean(),
                messaging: v.boolean(),
                payment: v.boolean(),
                general: v.boolean(),
            }),
        }),
        devices: v.array(
            v.object({
                deviceId: v.string(),
                deviceName: v.string(),
                deviceManufacturer: v.string(),
                osVersion: v.string(),
                platform: PlatformDeviceUnion,
                pushToken: v.optional(v.string()),
                isActive: v.boolean(),
                lastUsed: v.number(),
                createdAt: v.number(),
            }),
        ),
        updatedAt: v.optional(v.number()),
    }).index("by_userId", ["userId"]),
    userSuspensions: defineTable({
        userId: v.string(), // BetterAuth ID
        adminId: v.id("profiles"), // The admin who issued the suspension
        reason: v.string(),
        lengthInDays: v.number(),
        start: v.number(), // Unix timestamp (Date.now())
        end: v.number(), // Unix timestamp
        status: SuspensionStatusUnion,
    }).index("by_userId", ["userId"]),
    media: defineTable({
        userId: v.string(), // BetterAuth ID (Foreign Key)
        type: MediaTypeUnion, // e.g., "image", "video", "audio", "document"
        url: v.string(), // Storage URL
        caption: v.optional(v.string()),

        // We remove the 'likes' array from here to prevent
        // large document issues and improve reactivity.
    }).index("by_userId", ["userId"]),
    mediaLikes: defineTable({
        mediaId: v.id("media"), // Reference to the specific media
        userId: v.string(), // The BetterAuth ID of the person who liked it
    })
        .index("by_mediaId", ["mediaId"])
        .index("by_userId_and_mediaId", ["userId", "mediaId"]), // For "Has user liked this?" checks
    notifications: defineTable({
        userId: v.string(), // The recipient (BetterAuth ID)
        title: v.string(),
        content: v.string(),
        read: v.boolean(),

        // Legend: message, booking, general, admin, review, payment
        type: NotificationTypeUnion,

        // Meta remains an object for flexible deep-linking (e.g., bookingId, chatId)
        meta: v.optional(v.any()),

        // The user who triggered the notification (e.g., the person who sent the message)
        metaUser: v.optional(v.string()),
    })
        .index("by_userId", ["userId"])
        .index("by_read_status", ["userId", "read"]), // Critical for "Unread Count" badges
    services: defineTable({
        userId: v.string(), // BetterAuth ID of the Creative
        name: v.string(),
        description: v.string(),
        categoryId: v.id("serviceCategories"), // Linking to our dynamic categories table

        // Pricing & Payment
        paymentSystem: ServicePaymentSystemUnion,
        serviceFee: v.number(),
        bookingFee: v.number(),

        // Media & Metadata
        banners: v.array(v.string()), // Array of storage URLs
        tags: v.array(v.string()),

        // Availability Structure
        availability: v.array(
            v.object({
                day: v.number(), // 0 (Sun) to 6 (Sat)
                start: v.number(), // Minutes from midnight (e.g., 540 for 9:00 AM)
                end: v.number(), // Minutes from midnight (e.g., 1020 for 5:00 PM)
                selected: v.boolean(), // Is the creative actually working this day?
            }),
        ),

        // Duration (Replacing Mixed with a structured object)
        duration: v.number(), // Always in minutes for easy math (e.g. 60)
        bufferTime: v.number(), // Travel/Prep time in minutes (e.g. 30)

        // Status flags
        status: ServiceStatusUnion, // active/inactive
        deleteStatus: v.boolean(),

        // Analytics (Kept here for easy sorting, e.g., "Most Ordered")
        stats: v.object({
            timesOrdered: v.number(),
            timesCompleted: v.number(),
            timesCancelled: v.number(),
            timesRescheduled: v.number(),
        }),

        // NEW: Service-level travel preference (overrides profile default)
        travelOption: v.optional(ServiceTravelOptionUnion),
        travelFee: v.optional(v.number()), // Additional fee if traveling
    })
        .index("by_userId", ["userId"])
        .index("by_user_status", ["userId", "status"])
        .index("by_category", ["categoryId"])
        .index("by_status", ["status", "deleteStatus"]),
    bookings: defineTable({
        orderNo: v.string(), // e.g., "WND-1002"
        clientId: v.string(), // BetterAuth ID
        creativeId: v.string(), // BetterAuth ID
        serviceId: v.id("services"),

        // Timing (Using our Minutes-from-Midnight + Unix Timestamps)
        dateBooked: v.number(), // Unix timestamp for the day
        startTime: v.number(), // Minutes from midnight
        endTime: v.number(), // startTime + duration

        status: BookingStatusUnion,

        // Financial Summary
        proposedTotal: v.number(),
        bookingFee: v.number(),
        serviceFee: v.number(),
        tax: v.number(),

        note: v.optional(v.string()),

        // Cancellation details (Flat, not a separate table)
        cancel: v.optional(
            v.object({
                by: v.string(),
                reason: v.string(),
                date: v.number(),
            }),
        ),

        // Job Completion (Media storage IDs)
        jobCompletionDocs: v.array(
            v.object({
                url: v.string(),
                type: BookingCompletionDocUnion,
            }),
        ),

        updatedAt: v.number(),
    })
        .index("by_orderNo", ["orderNo"])
        .index("by_client", ["clientId"])
        .index("by_creative", ["creativeId"])
        .index("by_status", ["status"]),
    payments: defineTable({
        bookingId: v.id("bookings"),
        userId: v.string(), // Payer
        stripePaymentIntentId: v.string(),
        amount: v.number(),
        wondarFee: v.number(),
        tax: v.number(),
        status: PaymentStatusUnion,
    }).index("by_booking", ["bookingId"]),
    reviews: defineTable({
        bookingId: v.id("bookings"),
        authorId: v.string(), // Reviewer
        targetId: v.string(), // Person being reviewed
        rating: v.number(), // 1-5
        content: v.string(),
        role: ReviewRoleUnion,
    })
        .index("by_target", ["targetId"])
        .index("by_author", ["authorId"]),

    // ==========================================
    // SYSTEM CONFIGURATION
    // ==========================================

    systemConfig: defineTable({
        key: v.string(),
        value: v.any(),
        description: v.string(),
        category: SystemConfigCategoryUnion,
        isEditable: v.boolean(), // Can be changed from admin
        updatedAt: v.number(),
        updatedBy: v.optional(v.string()),
    })
        .index("by_key", ["key"])
        .index("by_category", ["category"]),

    // Creative's Stripe Connect info (extend creativeProfiles or separate)
    stripeAccounts: defineTable({
        userId: v.string(),
        stripeAccountId: v.string(),
        accountType: v.union(v.literal("express"), v.literal("standard")),

        // Status
        status: StripeAccountStatusUnion,

        balance: v.optional(v.number()), // In cents, for quick access without Stripe API call

        // Capabilities
        chargesEnabled: v.boolean(),
        payoutsEnabled: v.boolean(),
        detailsSubmitted: v.boolean(),

        // Payout schedule
        payoutSchedule: v.object({
            interval: StripePaymentScheduleIntervalUnion,
            weeklyAnchor: v.optional(v.string()), // "monday", "friday", etc.
            monthlyAnchor: v.optional(v.number()), // 1-31
        }),

        // Business info (from Stripe)
        businessName: v.optional(v.string()),
        country: v.string(),
        defaultCurrency: v.string(),

        // Timestamps
        updatedAt: v.number(),
        onboardingCompletedAt: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_stripeAccountId", ["stripeAccountId"]),

    // For CLIENTS (Stripe Customer - paying money)
    stripeCustomers: defineTable({
        userId: v.string(),
        stripeCustomerId: v.string(),
        email: v.optional(v.string()),
        defaultPaymentMethodId: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_stripeCustomerId", ["stripeCustomerId"]),

    // ==========================================
    // TRANSACTIONS
    // ==========================================

    transactions: defineTable({
        // References
        bookingId: v.id("bookings"),
        clientId: v.string(),
        creativeId: v.string(),
        serviceId: v.id("services"),

        // Stripe IDs
        stripePaymentIntentId: v.string(),
        stripeChargeId: v.optional(v.string()),
        stripeTransferId: v.optional(v.string()),

        // Amounts (all in cents, in transaction currency)
        currency: v.string(), // "usd", "gbp", etc.

        // Breakdown
        serviceFee: v.number(), // Base service fee
        bookingFee: v.number(), // Non-refundable deposit
        travelFee: v.number(), // If applicable
        subtotal: v.number(), // serviceFee + travelFee

        // Fees
        platformFeePercent: v.number(), // e.g., 15
        platformFeeAmount: v.number(), // Calculated platform fee

        stripeFeeAmount: v.number(), // Stripe processing fee
        clientStripeFeeShare: v.number(), // Client's 50% of Stripe fee
        creativeStripeFeeShare: v.number(), // Creative's 50% of Stripe fee

        // Final amounts
        totalCharged: v.number(), // What client paid (subtotal + clientStripeFeeShare)
        creativeEarnings: v.number(), // What creative receives
        platformEarnings: v.number(), // What Wondar keeps

        // Status
        status: TransactionStatusUnion,
        // Refund info
        refundedAmount: v.optional(v.number()),
        refundReason: v.optional(v.string()),
        refundedAt: v.optional(v.number()),

        // Timestamps
        createdAt: v.number(),
        completedAt: v.optional(v.number()),

        // Metadata
        metadata: v.optional(
            v.object({
                clientEmail: v.optional(v.string()),
                clientName: v.optional(v.string()),
                serviceName: v.optional(v.string()),
                bookingDate: v.optional(v.string()),
            }),
        ),
    })
        .index("by_bookingId", ["bookingId"])
        .index("by_clientId", ["clientId"])
        .index("by_creativeId", ["creativeId"])
        .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
        .index("by_status", ["status"])
        .index("by_createdAt", ["createdAt"]),

    // ==========================================
    // PAYOUTS
    // ==========================================

    payouts: defineTable({
        creativeId: v.string(),
        stripeAccountId: v.string(),
        stripePayoutId: v.string(),

        // Amount
        amount: v.number(), // In cents
        currency: v.string(),

        // Status
        status: PayoutStatusUnion,
        // Dates
        arrivalDate: v.number(), // Expected arrival
        paidAt: v.optional(v.number()),

        // Failure info
        failureCode: v.optional(v.string()),
        failureMessage: v.optional(v.string()),

        // Type
        type: PayoutTypeUnion,
        // Timestamps
        updatedAt: v.number(),
    })
        .index("by_creativeId", ["creativeId"])
        .index("by_stripePayoutId", ["stripePayoutId"])
        .index("by_status", ["status"]),

    // ==========================================
    // REFUNDS
    // ==========================================

    refunds: defineTable({
        transactionId: v.id("transactions"),
        bookingId: v.id("bookings"),
        stripeRefundId: v.string(),

        // Amounts
        amount: v.number(),
        currency: v.string(),

        // Who gets what back
        clientRefundAmount: v.number(),
        platformFeeRefunded: v.number(),
        creativeDeduction: v.number(),

        // Reason
        reason: RefundReasonUnion,
        reasonDetails: v.optional(v.string()),

        // Status
        status: RefundStatusUnion,

        // Who initiated
        initiatedBy: RefundInitiatedByUnion,
        initiatedByUserId: v.string(),

        // Timestamps
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_transactionId", ["transactionId"])
        .index("by_bookingId", ["bookingId"])
        .index("by_stripeRefundId", ["stripeRefundId"]),
    // ==========================================
    // SUPPORT/FOLLOW SYSTEM
    // ==========================================

    supports: defineTable({
        supporterId: v.string(), // User who is supporting (usually client)
        supportedId: v.string(), // User being supported (usually creative)
        supporterType: UserTypeUnion,
        supportedType: UserTypeUnion,
        createdAt: v.number(),
    })
        .index("by_supporter", ["supporterId"])
        .index("by_supported", ["supportedId"])
        .index("by_both", ["supporterId", "supportedId"]), // For checking if relationship exists
    waitlist: defineTable({
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),

        // Position tracking
        position: v.number(), // Queue position (1, 2, 3...)

        // Referral system
        referralCode: v.string(), // Unique code for this person to share
        referredBy: v.optional(v.string()), // Referral code of who referred them
        referralCount: v.number(), // How many people they've referred

        // Status tracking
        status: WaitlistStatusUnion, // pending, invited, joined, unsubscribed

        // User type interest
        interestedAs: v.optional(WaitlistInterestUnion), // Whether they're interested as a client, creative, or both

        // Location (optional, for launch targeting)
        city: v.optional(v.string()),
        state: v.optional(v.string()),

        // Timestamps
        createdAt: v.number(),
        invitedAt: v.optional(v.number()),
        joinedAt: v.optional(v.number()),
    })
        .index("by_email", ["email"])
        .index("by_position", ["position"])
        .index("by_referralCode", ["referralCode"])
        .index("by_status", ["status"])
        .index("by_referredBy", ["referredBy"]),
    favorites: defineTable({
        userId: v.string(), // User who favorited
        serviceId: v.id("services"), // Service being favorited
        createdAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_service", ["serviceId"])
        .index("by_both", ["userId", "serviceId"]),
});

export default schema;
