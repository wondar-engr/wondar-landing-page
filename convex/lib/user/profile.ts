import { api } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { authComponent, getAuthUserId } from "../../auth";
import { UserTypeUnion } from "../../unions";
import { CustomError } from "../../utils/errorUtils";
import { v } from "convex/values";

export const switchUserType = mutation({
    args: {
        newType: UserTypeUnion,
    },
    handler: async (ctx, { newType }) => {
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

            await ctx.db.patch(existingProfile._id, {
                currentType: newType,
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
                        : "Failed to switch user type.",
            };
        }
    },
});

export const updatePermissions = mutation({
    args: {
        gallery: v.optional(v.boolean()),
        notifications: v.optional(v.boolean()),
        location: v.optional(v.boolean()),
        onboardingComplete: v.optional(v.boolean()),
    },
    handler: async (
        ctx,
        { gallery, notifications, location, onboardingComplete },
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

            await ctx.db.patch(existingProfile._id, {
                permissions: {
                    gallery:
                        gallery !== undefined
                            ? gallery
                                ? "GRANTED"
                                : "DENIED"
                            : existingProfile.permissions?.gallery || "DENIED",
                    notifications:
                        notifications !== undefined
                            ? notifications
                                ? "GRANTED"
                                : "DENIED"
                            : existingProfile.permissions?.notifications ||
                              "DENIED",
                    location:
                        location !== undefined
                            ? location
                                ? "GRANTED"
                                : "DENIED"
                            : existingProfile.permissions?.location || "DENIED",
                    onboardingComplete:
                        onboardingComplete !== undefined
                            ? onboardingComplete
                            : existingProfile.permissions?.onboardingComplete ||
                              false,
                },
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
                        : "Failed to update permissions.",
            };
        }
    },
});

export const updateProfile = mutation({
    args: {
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        avatar: v.optional(v.string()),
        currentType: v.optional(UserTypeUnion),
        profileComplete: v.optional(v.boolean()),
    },
    handler: async (
        ctx,
        {
            firstName,
            lastName,
            currentType,
            avatar,
            phoneNumber,
            profileComplete,
        },
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
            if (phoneNumber) {
                const existingPhoneProfile = await ctx.db
                    .query("profiles")
                    .filter(q => q.eq(q.field("phoneNumber"), phoneNumber))
                    .unique();

                if (existingPhoneProfile) {
                    throw new CustomError(
                        "Phone number already in use. Please use a different number.",
                    );
                }
            }

            if (profileComplete) {
                // If marking profile as complete, ensure required fields are present
                if (!firstName && !existingProfile.firstName) {
                    throw new CustomError(
                        "First name is required to complete profile.",
                    );
                }
                if (!lastName && !existingProfile.lastName) {
                    throw new CustomError(
                        "Last name is required to complete profile.",
                    );
                }

                await ctx.db.insert("userSettings", {
                    userId,
                    notifications: {
                        channels: { phone: true, email: true },
                        triggers: {
                            booking: true,
                            payment: true,
                            general: true,
                            messaging: true,
                        },
                    },
                    devices: [],
                });

                await ctx.scheduler.runAfter(
                    0,
                    api.lib.emailActions.sendWelcomeEmailAction,
                    {
                        to: existingProfile.email,
                        firstName: existingProfile.firstName!,
                        selectedRole: existingProfile.currentType,
                    },
                );
            }

            await ctx.db.patch(existingProfile._id, {
                firstName: firstName || existingProfile.firstName,
                lastName: lastName || existingProfile.lastName,
                currentType: currentType || existingProfile.currentType,
                avatar: avatar || existingProfile.avatar,
                phoneNumber:
                    phoneNumber !== undefined
                        ? phoneNumber
                        : existingProfile.phoneNumber,
                updatedAt: Date.now(),
                phoneVerified: phoneNumber
                    ? true
                    : existingProfile.phoneVerified, // If phone number is removed, mark as unverified
                onboarding: {
                    ...existingProfile.onboarding,
                    profileComplete:
                        profileComplete !== undefined
                            ? true
                            : existingProfile.onboarding.profileComplete,
                },
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update profile.",
            };
        }
    },
});

export const initProfile = mutation({
    handler: async ctx => {
        try {
            const user = await authComponent.getAuthUser(ctx);
            if (!user) {
                throw new CustomError("User not authenticated");
            }

            const existingProfile = await ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", user._id))
                .unique();

            if (existingProfile) {
                return {
                    status: true,
                };
            }

            await ctx.db.insert("profiles", {
                userId: user._id,
                email: user.email,
                updatedAt: Date.now(),
                accountStatus: "ACTIVE",
                currentType: "CLIENT",
                onboarding: {
                    clientComplete: false,
                    creativeComplete: false,
                    profileComplete: false,
                },
                role: "USER",
            });

            return {
                status: true,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to initialize profile.",
            };
        }
    },
});
