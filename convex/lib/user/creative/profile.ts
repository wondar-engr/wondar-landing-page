import { api } from "../../../_generated/api";
import { mutation, query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";
import { CustomError } from "../../../utils/errorUtils";
import { v } from "convex/values";

export const getCreativeProfile = query({
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        if (!profile) return null;

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        const categories = creativeProfile?.skills
            ? await Promise.all(
                  creativeProfile.skills.map(id => ctx.db.get(id)),
              )
            : [];

        const skillNames = categories?.map(cat => (cat ? cat.name : ""));

        return {
            ...profile,
            creative: {
                ...creativeProfile,
                skills: skillNames,
            },
        };
    },
});

export const initCreativeProfile = mutation({
    args: {},
    handler: async ctx => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            // Check if already exists
            const existing = await ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (existing) {
                return { success: true, profileId: existing._id };
            }

            const profileId = await ctx.db.insert("creativeProfiles", {
                userId,
                businessName: "",
                skills: [], // Initialize as empty array for multiple skills
                aboutMe: "",
                coverImage: "",
                workAddress: {
                    address: "",
                    city: "",
                    state: "",
                    zipCode: "",
                    lat: 0,
                    lng: 0,
                },
                accountStatus: "ACTIVE",
                onboardingComplete: false,
            });

            return { success: true, profileId };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to initialize creative profile.",
            };
        }
    },
});

export const updateCreativeProfile = mutation({
    args: {
        businessName: v.optional(v.string()),
        skillIds: v.optional(v.array(v.id("serviceCategories"))), // Updated to array of category IDs
        aboutMe: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        workAddress: v.optional(
            v.object({
                address: v.string(),
                city: v.string(),
                state: v.string(),
                zipCode: v.string(),
                lat: v.number(),
                lng: v.number(),
            }),
        ),
        willingToTravel: v.optional(v.boolean()),
        travelRadius: v.optional(v.number()),
        onboardingComplete: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) throw new CustomError("Unauthorized");

            const profile = await ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!profile) throw new CustomError("Creative profile not found");

            const updates: Record<
                string,
                string | boolean | object | number | string[]
            > = {};

            if (args.businessName !== undefined)
                updates.businessName = args.businessName;
            if (args.skillIds !== undefined) updates.skills = args.skillIds;
            if (args.aboutMe !== undefined) updates.aboutMe = args.aboutMe;
            if (args.coverImage !== undefined)
                updates.coverImage = args.coverImage;
            if (args.workAddress !== undefined)
                updates.workAddress = args.workAddress;
            if (args.willingToTravel !== undefined)
                updates.willingToTravel = args.willingToTravel;
            if (args.travelRadius !== undefined)
                updates.travelRadius = args.travelRadius;
            if (args.onboardingComplete !== undefined)
                updates.onboardingComplete = args.onboardingComplete;

            await ctx.db.patch(profile._id, updates);

            // If onboarding is complete, also update the main profile
            if (args.onboardingComplete) {
                const mainProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", userId))
                    .unique();

                if (mainProfile) {
                    await ctx.db.patch(mainProfile._id, {
                        onboarding: {
                            ...mainProfile.onboarding,
                            creativeComplete: true,
                        },
                    });
                }
            }

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update creative profile.",
            };
        }
    },
});

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
            const creativeProfile = await ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .unique();

            if (!creativeProfile) {
                throw new CustomError("Creative profile not found");
            }

            await ctx.db.patch(profile._id, {
                onboarding: {
                    ...profile.onboarding,
                    creativeComplete: true,
                },
            });

            await ctx.db.patch(creativeProfile._id, {
                onboardingComplete: true,
            });

            console.log(
                "Creative profile skills on completion:",
                creativeProfile.skills,
            );

            // Fetch all category names
            const categories = await Promise.all(
                creativeProfile.skills!.map(id => ctx.db.get(id)),
            );

            const skillNames = categories?.map(cat => (cat ? cat.name : ""));

            await ctx.scheduler.runAfter(
                0,
                api.lib.emailActions.sendCreativeOnboardingCompleteAction,
                {
                    to: profile.email,
                    firstName: profile.firstName!,
                    businessName: creativeProfile.businessName!,
                    skillNames: skillNames.filter(
                        name => name !== "",
                    ) as string[], // Filter out any null names
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
