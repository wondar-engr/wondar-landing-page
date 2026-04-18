import { internalMutation } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { CustomError } from "../../utils/errorUtils";
import { v } from "convex/values";

export const createPhoneVerificationCodeEntry = internalMutation({
    args: {
        phoneNumber: v.string(),
    },
    handler: async (ctx, { phoneNumber }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }
            const existingEntry = await ctx.db
                .query("phoneVerificationCodes")
                .withIndex("by_phoneNumber", q =>
                    q.eq("phoneNumber", phoneNumber),
                )
                .unique();

            if (existingEntry) {
                await ctx.db.patch(existingEntry._id, {
                    expiresAt: Date.now() + 5 * 60 * 1000, // Code valid for 5 minutes
                    attempts: existingEntry.attempts + 1,
                });
            } else {
                await ctx.db.insert("phoneVerificationCodes", {
                    phoneNumber,
                    expiresAt: Date.now() + 5 * 60 * 1000, // Code valid for 5 minutes
                    attempts: 1,
                    verified: false,
                    userId,
                });
            }

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to create phone verification code entry.",
            };
        }
    },
});

export const updatePhoneVerificationCodeEntry = internalMutation({
    args: {
        phoneNumber: v.string(),
    },
    handler: async (ctx, { phoneNumber }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }
            const existingEntry = await ctx.db
                .query("phoneVerificationCodes")
                .withIndex("by_phoneNumber", q =>
                    q.eq("phoneNumber", phoneNumber),
                )
                .unique();

            if (!existingEntry) {
                throw new CustomError("Phone verification entry not found");
            }

            await ctx.db.patch(existingEntry._id, {
                verified: true,
            });

            return { status: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to create phone verification code entry.",
            };
        }
    },
});

/**
 * Update profile phone number (internal mutation)
 */
export const updateProfilePhone = internalMutation({
    args: {
        phoneNumber: v.string(),
    },
    handler: async (ctx, { phoneNumber }) => {
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
                throw new Error("Profile not found");
            }

            await ctx.db.patch(profile._id, {
                phoneNumber,
                phoneVerified: true,
                updatedAt: Date.now(),
            });

            return { success: true };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                success: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update profile with phone number.",
            };
        }
    },
});
