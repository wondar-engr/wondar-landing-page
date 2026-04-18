import { api } from "../../../_generated/api";
import { mutation, query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";
import { CustomError } from "../../../utils/errorUtils";
import { v } from "convex/values";

export const handleCompleteOnboarding = mutation({
    async handler(ctx) {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }

            const profile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!profile) {
                throw new CustomError("Profile not found");
            }
            const clientProfile = await ctx.db
                .query("clientProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!clientProfile) {
                throw new CustomError("Client profile not found");
            }

            await ctx.db.patch(profile._id, {
                onboarding: {
                    ...profile.onboarding,
                    clientComplete: true,
                },
            });

            await ctx.scheduler.runAfter(
                0,
                api.lib.emailActions.sendClientOnboardingCompleteAction,
                {
                    to: profile.email,
                    firstName: profile.firstName!,
                },
            );

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to complete onboarding.",
            };
        }
    },
});

export const getServiceCategories = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const categories = await ctx.db.query("serviceCategories").collect();
        return categories;
    },
});

export const getClientProfile = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        if (!profile) return null;

        const clientProfile = await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        return { ...profile, client: clientProfile || null };
    },
});

export const updateClientProfile = mutation({
    args: {
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
        favoriteCategories: v.optional(v.array(v.id("serviceCategories"))), // Array of category IDs
    },
    handler: async (
        ctx,
        { companyName, aboutCompany, personalAddress, favoriteCategories },
    ) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }

            const existingProfile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!existingProfile) {
                throw new CustomError("Profile not found");
            }

            const existingClientProfile = await ctx.db
                .query("clientProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!existingClientProfile) {
                throw new CustomError("Client profile not found");
            }

            await ctx.db.patch(existingClientProfile._id, {
                companyName: companyName ?? existingClientProfile.companyName,
                aboutCompany:
                    aboutCompany ?? existingClientProfile.aboutCompany,
                personalAddress:
                    personalAddress ?? existingClientProfile.personalAddress,
                favoriteCategories:
                    favoriteCategories ??
                    existingClientProfile.favoriteCategories,
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update client profile.",
            };
        }
    },
});

export const initClientProfile = mutation({
    handler: async ctx => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }
            const existingProfile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!existingProfile) {
                throw new CustomError("Profile not found");
            }

            const existingClientProfile = await ctx.db
                .query("clientProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (existingClientProfile) {
                return { status: true }; // Already initialized, no action needed
            }

            await ctx.db.insert("clientProfiles", {
                userId,
                accountStatus: "ACTIVE",
                favoriteCategories: [],
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to initialize client profile.",
            };
        }
    },
});

export const getClientProfileAccount = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const clientProfile = await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        // Get booking stats
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", userId))
            .collect();

        const completedBookings = bookings.filter(
            b => b.status === "COMPLETED",
        ).length;

        const totalSpent = bookings
            .filter(b => b.status === "COMPLETED")
            .reduce((sum, b) => sum + b.proposedTotal, 0);

        return {
            profile,
            clientProfile,
            stats: {
                totalBookings: bookings.length,
                completedBookings,
                totalSpent,
            },
        };
    },
});

// export const updateClientProfile = mutation({
//     args: {
//         firstName: v.optional(v.string()),
//         lastName: v.optional(v.string()),
//         phoneNumber: v.optional(v.string()),
//         avatar: v.optional(v.string()),
//         companyName: v.optional(v.string()),
//         aboutCompany: v.optional(v.string()),
//     },
//     handler: async (ctx, args) => {
//         const userId = await getAuthUserId(ctx);
//         if (!userId) throw new Error("Not authenticated");

//         const profile = await ctx.db
//             .query("profiles")
//             .withIndex("by_userId", q => q.eq("userId", userId))
//             .first();

//         if (!profile) throw new Error("Profile not found");

//         // Update main profile
//         await ctx.db.patch(profile._id, {
//             firstName: args.firstName,
//             lastName: args.lastName,
//             phoneNumber: args.phoneNumber,
//             avatar: args.avatar,
//             updatedAt: Date.now(),
//         });

//         // Update client profile if company info provided
//         if (args.companyName !== undefined || args.aboutCompany !== undefined) {
//             const clientProfile = await ctx.db
//                 .query("clientProfiles")
//                 .withIndex("by_userId", q => q.eq("userId", userId))
//                 .first();

//             if (clientProfile) {
//                 await ctx.db.patch(clientProfile._id, {
//                     companyName: args.companyName,
//                     aboutCompany: args.aboutCompany,
//                 });
//             }
//         }

//         return { success: true };
//     },
// });
