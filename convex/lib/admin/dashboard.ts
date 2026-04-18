import { query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";

export const getKPIStats = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get all transactions
        const transactions = await ctx.db.query("transactions").collect();

        // Calculate GMV (total successful transactions)
        const successfulTransactions = transactions.filter(
            t => t.status === "SUCCEEDED",
        );
        const totalGMV = successfulTransactions.reduce(
            (sum, t) => sum + t.totalCharged,
            0,
        );
        const totalPlatformFees = successfulTransactions.reduce(
            (sum, t) => sum + t.platformFeeAmount,
            0,
        );

        // Get active users (profiles with ACTIVE status)
        const profiles = await ctx.db.query("profiles").collect();
        const activeProfiles = profiles.filter(
            p => p.accountStatus === "ACTIVE",
        );
        const activeCreatives = activeProfiles.filter(
            p => p.currentType === "CREATIVE",
        ).length;
        const activeClients = activeProfiles.filter(
            p => p.currentType === "CLIENT",
        ).length;

        // Get 30-day booking volume
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const bookings = await ctx.db.query("bookings").collect();
        const thirtyDayBookings = bookings.filter(
            b => b._creationTime >= thirtyDaysAgo,
        );

        // Calculate booking stats by status
        const bookingsByStatus = {
            inProgress: bookings.filter(b => b.status === "IN_PROGRESS").length,
            pending: bookings.filter(b => b.status === "PENDING").length,
            completed: bookings.filter(b => b.status === "COMPLETED").length,
            cancelled: bookings.filter(b => b.status === "CANCELLED").length,
            dispute: bookings.filter(b => b.status === "DISPUTE").length,
            refunded: bookings.filter(b => b.status === "REFUNDED").length,
        };

        // Pending creatives (PENDING status)
        const pendingCreatives = profiles.filter(
            p => p.accountStatus === "PENDING" && p.currentType === "CREATIVE",
        ).length;

        return {
            totalGMV,
            totalPlatformFees,
            activeCreatives,
            activeClients,
            thirtyDayBookingVolume: thirtyDayBookings.length,
            totalBookings: bookings.length,
            bookingsByStatus,
            pendingCreatives,
            totalUsers: profiles.length,
        };
    },
});

export const getRecentBookings = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get recent bookings with service details
        const bookings = await ctx.db.query("bookings").order("desc").take(10);

        const bookingsWithDetails = await Promise.all(
            bookings.map(async booking => {
                const service = await ctx.db.get(booking.serviceId);
                const client = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.clientId),
                    )
                    .first();
                const creative = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                return {
                    _id: booking._id,
                    orderNo: booking.orderNo,
                    serviceName: service?.name || "Unknown Service",
                    amount: booking.proposedTotal,
                    status: booking.status,
                    clientName: client
                        ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
                        : "Unknown",
                    creativeName: creative
                        ? `${creative.firstName || ""} ${creative.lastName || ""}`.trim()
                        : "Unknown",
                    _creationTime: booking._creationTime,
                    dateBooked: booking.dateBooked,
                };
            }),
        );

        return bookingsWithDetails;
    },
});

export const getTopCreatives = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get all creative profiles with stats
        const creativeProfiles = await ctx.db
            .query("creativeProfiles")
            .collect();

        // Get profiles for names/avatars
        const creativesWithDetails = await Promise.all(
            creativeProfiles
                .filter(cp => cp.stats && cp.accountStatus === "ACTIVE")
                .map(async cp => {
                    const profile = await ctx.db
                        .query("profiles")
                        .withIndex("by_userId", q => q.eq("userId", cp.userId))
                        .first();

                    // Get transactions for this creative
                    const transactions = await ctx.db
                        .query("transactions")
                        .withIndex("by_creativeId", q =>
                            q.eq("creativeId", cp.userId),
                        )
                        .collect();

                    const totalRevenue = transactions
                        .filter(t => t.status === "SUCCEEDED")
                        .reduce((sum, t) => sum + t.creativeEarnings, 0);

                    // Get primary skill/category
                    let categoryName = "General";
                    if (cp.skills && cp.skills.length > 0) {
                        const category = await ctx.db.get(cp.skills[0]);
                        categoryName = category?.name || "General";
                    }

                    return {
                        _id: profile?._id,
                        oddbytes: cp.userId,
                        firstName: profile?.firstName || "Unknown",
                        lastName: profile?.lastName || "",
                        avatarUrl: profile?.avatar || null,
                        businessName: cp.businessName,
                        category: categoryName,
                        totalBookings: cp.stats?.totalBookings || 0,
                        completedBookings: cp.stats?.completedBookings || 0,
                        totalRevenue,
                        rating: cp.stats?.averageRating || 0,
                        reviewCount: cp.stats?.totalReviews || 0,
                    };
                }),
        );

        // Sort by total revenue and take top 5
        return creativesWithDetails
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);
    },
});

export const getModerationStats = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get active disputes
        const bookings = await ctx.db.query("bookings").collect();
        const activeDisputes = bookings.filter(
            b => b.status === "DISPUTE",
        ).length;

        // Get suspended users
        const profiles = await ctx.db.query("profiles").collect();
        const suspendedUsers = profiles.filter(
            p => p.accountStatus === "SUSPENDED",
        ).length;

        // Get active suspensions
        const suspensions = await ctx.db.query("userSuspensions").collect();
        const activeSuspensions = suspensions.filter(
            s => s.status === "ACTIVE",
        ).length;

        // Get pending approvals
        const pendingApprovals = profiles.filter(
            p => p.accountStatus === "PENDING",
        ).length;

        return {
            activeDisputes,
            suspendedUsers,
            activeSuspensions,
            pendingApprovals,
        };
    },
});

export const getPayoutStats = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const payouts = await ctx.db.query("payouts").collect();

        const pendingPayouts = payouts.filter(
            p => p.status === "PENDING" || p.status === "IN_TRANSIT",
        );
        const completedPayouts = payouts.filter(p => p.status === "PAID");
        const failedPayouts = payouts.filter(p => p.status === "FAILED");

        return {
            pendingCount: pendingPayouts.length,
            pendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
            completedCount: completedPayouts.length,
            completedAmount: completedPayouts.reduce(
                (sum, p) => sum + p.amount,
                0,
            ),
            failedCount: failedPayouts.length,
            failedAmount: failedPayouts.reduce((sum, p) => sum + p.amount, 0),
        };
    },
});

export const getPendingCreatives = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get profiles with PENDING status who are creatives
        const profiles = await ctx.db.query("profiles").collect();
        const pendingProfiles = profiles.filter(
            p => p.accountStatus === "PENDING" && p.currentType === "CREATIVE",
        );

        const pendingWithDetails = await Promise.all(
            pendingProfiles.slice(0, 10).map(async profile => {
                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", profile.userId))
                    .first();

                // Get skill names
                let skills: string[] = [];
                if (creativeProfile?.skills) {
                    const skillDocs = await Promise.all(
                        creativeProfile.skills
                            .slice(0, 3)
                            .map(id => ctx.db.get(id)),
                    );
                    skills = skillDocs.filter(Boolean).map(s => s!.name);
                }

                return {
                    _id: profile._id,
                    oddbytes: profile.userId,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                    businessName: creativeProfile?.businessName || "Not Set",
                    skills,
                    _creationTime: profile._creationTime,
                };
            }),
        );

        return pendingWithDetails;
    },
});

export const getFlaggedServices = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Get services with INACTIVE status or those that might need review
        // In a real app, you'd have a separate flagging system
        // For now, we'll get inactive services as "flagged"
        const services = await ctx.db.query("services").collect();

        const flaggedServices = services.filter(
            s => s.status === "INACTIVE" && !s.deleteStatus,
        );

        const flaggedWithDetails = await Promise.all(
            flaggedServices.slice(0, 10).map(async service => {
                const creative = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .first();

                const category = await ctx.db.get(service.categoryId);

                return {
                    _id: service._id,
                    name: service.name,
                    creativeName: creative
                        ? `${creative.firstName || ""} ${creative.lastName || ""}`.trim()
                        : "Unknown",
                    creativeId: creative?._id,
                    category: category?.name || "Unknown",
                    price: service.serviceFee,
                    flagReason: "review_required" as const,
                    flaggedAt: service._creationTime,
                    reportCount: 0,
                };
            }),
        );

        return flaggedWithDetails;
    },
});

export const getRecentTransactions = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const transactions = await ctx.db
            .query("transactions")
            .order("desc")
            .take(10);

        const transactionsWithDetails = await Promise.all(
            transactions.map(async tx => {
                const booking = await ctx.db.get(tx.bookingId);
                const client = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", tx.clientId))
                    .first();

                return {
                    _id: tx._id,
                    orderNo: booking?.orderNo || "Unknown",
                    amount: tx.totalCharged,
                    platformFee: tx.platformFeeAmount,
                    status: tx.status,
                    clientName: client
                        ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
                        : "Unknown",
                    createdAt: tx.createdAt,
                };
            }),
        );

        return transactionsWithDetails;
    },
});
