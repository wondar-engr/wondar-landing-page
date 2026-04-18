import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { CustomError } from "../utils/errorUtils";
import { getAuthUserId } from "../auth";
import { api } from "../_generated/api";

/**
 * Send phone verification code
 * Calls Twilio action and tracks the request
 */
export const sendVerificationCode = mutation({
    args: {
        phoneNumber: v.string(),
    },
    handler: async (ctx, { phoneNumber }) => {
        try {
            // Validate phone number format
            if (!phoneNumber.match(/^\+1\d{10}$/)) {
                return {
                    success: false,
                    error: "Invalid phone number format. Use +1XXXXXXXXXX",
                };
            }

            // Call Twilio action to send OTP
            await ctx.scheduler.runAfter(
                0,
                api.lib.appActions.twilioActions.sendTwilioOtp,
                {
                    phoneNumber,
                },
            );

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
                        : "Failed to send verification code.",
            };
        }
    },
});

/**
 * Verify phone code and update profile
 */
export const verifyCodeAndUpdateProfile = action({
    args: {
        phoneNumber: v.string(),
        code: v.string(),
        profileId: v.id("profiles"),
    },
    handler: async (ctx, { phoneNumber, code }) => {
        try {
            // Validate phone number format
            if (!phoneNumber.match(/^\+1\d{10}$/)) {
                throw new CustomError(
                    "Invalid phone number format. Use +1XXXXXXXXXX",
                );
            }

            // Verify with Twilio
            const result = await ctx.scheduler.runAfter(
                0,
                api.lib.appActions.twilioActions.verifyTwilioOtp,
                {
                    phoneNumber,
                    code,
                },
            );

            if (!result) {
                throw new CustomError("Invalid verification code");
            }

            return {
                success: true,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to verify code and update profile.",
            };
        }
    },
});

/**
 * Update profile phone number (internal mutation)
 */
export const updateProfilePhone = mutation({
    args: {
        profileId: v.id("profiles"),
        phoneNumber: v.string(),
    },
    handler: async (ctx, { profileId, phoneNumber }) => {
        await ctx.db.patch(profileId, {
            phoneNumber,
            phoneVerified: true,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

export const checkSigninUserExists = mutation({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            const profiles = await ctx.db.query("profiles").collect();

            if (!profiles.length)
                return {
                    status: true,
                };

            const profile = await ctx.db
                .query("profiles")
                .filter(q => q.eq(q.field("email"), args.email))
                .unique();

            if (!profile) {
                throw new CustomError(
                    "Account does not exist. Please check credentials.",
                );
            }

            if (profile.role !== "ADMIN") {
                throw new CustomError(
                    "Account does not exist. Please check credentials.",
                );
            }
            return {
                status: true,
            };
        } catch (err: unknown) {
            console.log("[CHECK_ACCOUNT_EXISTS_LOGIN_ERR:", err);
            if (err instanceof Error) {
                return {
                    status: false,
                    error:
                        err?.message ||
                        "Account does not exist. Please create an account.",
                };
            } else {
                return {
                    status: false,
                    error: "Account does not exist. Please create an account.",
                };
            }
        }
    },
});

export const getCurrentUser = query({
    async handler(ctx) {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .unique();

        return profile;
    },
});
