import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { CustomError } from "../../utils/errorUtils";

export const getUsers = query({
    args: {
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
        accountStatus: v.optional(v.string()),
        currentType: v.optional(v.string()),
        role: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const page = args.page ?? 1;
        const limit = args.limit ?? 10;

        // Get all profiles
        let profiles = await ctx.db.query("profiles").collect();

        // Apply filters
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            profiles = profiles.filter(
                p =>
                    p.firstName?.toLowerCase().includes(searchLower) ||
                    p.lastName?.toLowerCase().includes(searchLower) ||
                    p.email.toLowerCase().includes(searchLower) ||
                    p.phoneNumber?.includes(args.search!),
            );
        }

        if (args.accountStatus) {
            profiles = profiles.filter(
                p => p.accountStatus === args.accountStatus,
            );
        }

        if (args.currentType) {
            profiles = profiles.filter(p => p.currentType === args.currentType);
        }

        if (args.role) {
            profiles = profiles.filter(p => p.role === args.role);
        }

        // Sort by most recent first (using _creationTime)
        profiles.sort((a, b) => b._creationTime - a._creationTime);

        // Calculate pagination
        const totalCount = profiles.length;
        const totalPages = Math.ceil(totalCount / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        // Slice for current page
        const paginatedProfiles = profiles.slice(startIndex, endIndex);

        return {
            users: paginatedProfiles,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    },
});

export const getUserById = query({
    args: {
        id: v.id("profiles"),
    },
    handler: async (ctx, { id }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db.get(id);
        if (!profile) return null;

        // Get related data
        const [creativeProfile, clientProfile, settings, suspensions] =
            await Promise.all([
                ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", profile.userId))
                    .first(),
                ctx.db
                    .query("clientProfiles")
                    .withIndex("by_userId", q => q.eq("userId", profile.userId))
                    .first(),
                ctx.db
                    .query("userSettings")
                    .withIndex("by_userId", q => q.eq("userId", profile.userId))
                    .first(),
                ctx.db
                    .query("userSuspensions")
                    .withIndex("by_userId", q => q.eq("userId", profile.userId))
                    .collect(),
            ]);

        // Get booking stats
        const bookingsAsClient = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", profile.userId))
            .collect();

        const bookingsAsCreative = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", profile.userId))
            .collect();

        // Get reviews
        const reviewsReceived = await ctx.db
            .query("reviews")
            .withIndex("by_target", q => q.eq("targetId", profile.userId))
            .collect();

        // Get payment settings
        const paymentSettings = await ctx.db
            .query("userPaymentSettings")
            .withIndex("by_userId", q => q.eq("userId", profile.userId))
            .first();

        return {
            profile,
            creativeProfile,
            clientProfile,
            settings,
            suspensions,
            paymentSettings,
            stats: {
                bookingsAsClient: bookingsAsClient.length,
                bookingsAsCreative: bookingsAsCreative.length,
                completedBookings: [
                    ...bookingsAsClient,
                    ...bookingsAsCreative,
                ].filter(b => b.status === "COMPLETE").length,
                cancelledBookings: [
                    ...bookingsAsClient,
                    ...bookingsAsCreative,
                ].filter(b => b.status === "CANCELLED").length,
                totalReviews: reviewsReceived.length,
                averageRating:
                    reviewsReceived.length > 0
                        ? reviewsReceived.reduce(
                              (sum, r) => sum + r.rating,
                              0,
                          ) / reviewsReceived.length
                        : 0,
            },
        };
    },
});

export const updateUserStatus = mutation({
    args: {
        id: v.id("profiles"),
        accountStatus: v.union(
            v.literal("ACTIVE"),
            v.literal("SUSPENDED"),
            v.literal("PENDING"),
            v.literal("REJECTED"),
        ),
    },
    handler: async (ctx, { id, accountStatus }) => {
        try {
            const adminId = await getAuthUserId(ctx);
            if (!adminId) {
                throw new CustomError("Unauthorized");
            }

            const profile = await ctx.db.get(id);
            if (!profile) {
                throw new CustomError("User not found");
            }

            await ctx.db.patch(id, {
                accountStatus,
                updatedAt: Date.now(),
            });

            return { status: true, data: id };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update user status.",
            };
        }
    },
});

export const updateUserRole = mutation({
    args: {
        id: v.id("profiles"),
        role: v.union(v.literal("ADMIN"), v.literal("USER")),
    },
    handler: async (ctx, { id, role }) => {
        try {
            const adminId = await getAuthUserId(ctx);
            if (!adminId) {
                throw new CustomError("Unauthorized");
            }

            const profile = await ctx.db.get(id);
            if (!profile) {
                throw new CustomError("User not found");
            }

            await ctx.db.patch(id, {
                role,
                updatedAt: Date.now(),
            });

            return { status: true, data: id };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update user role.",
            };
        }
    },
});

export const suspendUser = mutation({
    args: {
        id: v.id("profiles"),
        reason: v.string(),
        lengthInDays: v.number(),
    },
    handler: async (ctx, { id, reason, lengthInDays }) => {
        try {
            const adminId = await getAuthUserId(ctx);
            if (!adminId) {
                throw new CustomError("Unauthorized");
            }

            const profile = await ctx.db.get(id);
            if (!profile) {
                throw new CustomError("User not found");
            }

            // Get admin profile
            const adminProfile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", adminId))
                .first();

            if (!adminProfile) {
                throw new CustomError("Admin profile not found");
            }

            const now = Date.now();
            const endDate = now + lengthInDays * 24 * 60 * 60 * 1000;

            // Create suspension record
            await ctx.db.insert("userSuspensions", {
                userId: profile.userId,
                adminId: adminProfile._id,
                reason,
                lengthInDays,
                start: now,
                end: endDate,
                status: "ACTIVE",
            });

            // Update user status
            await ctx.db.patch(id, {
                accountStatus: "SUSPENDED",
                updatedAt: now,
            });

            return { status: true, data: id };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to suspend user.",
            };
        }
    },
});

export const revokeSuspension = mutation({
    args: {
        suspensionId: v.id("userSuspensions"),
        profileId: v.id("profiles"),
    },
    handler: async (ctx, { suspensionId, profileId }) => {
        try {
            const adminId = await getAuthUserId(ctx);
            if (!adminId) {
                throw new CustomError("Unauthorized");
            }

            // Update suspension status
            await ctx.db.patch(suspensionId, {
                status: "REVOKED",
            });

            // Update user status back to active
            await ctx.db.patch(profileId, {
                accountStatus: "ACTIVE",
                updatedAt: Date.now(),
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to revoke suspension.",
            };
        }
    },
});
