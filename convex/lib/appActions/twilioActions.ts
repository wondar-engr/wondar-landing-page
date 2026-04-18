"use node";

import Twilio from "twilio";
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { CustomError } from "../../utils/errorUtils";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

const getTwilioClient = () => {
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured");
    }
    return Twilio(accountSid, authToken);
};

/**
 * Send OTP via Twilio Verify Service
 */
export const sendTwilioOtp = action({
    args: {
        phoneNumber: v.string(),
    },
    handler: async (ctx, { phoneNumber }) => {
        const client = getTwilioClient();

        try {
            const verification = await client.verify.v2
                .services(verifyServiceSid)
                .verifications.create({
                    to: phoneNumber,
                    channel: "sms",
                });

            console.log("Twilio verification sent:", verification.status);

            const res = await ctx.runMutation(
                internal.lib.internalMuts.auth.createPhoneVerificationCodeEntry,
                {
                    phoneNumber,
                },
            );

            if (!res.status) {
                console.error(
                    "Failed to create phone verification code entry:",
                    res.error,
                );
                throw new CustomError(
                    "Failed to create phone verification code entry",
                );
            }
            return {
                status: true,
                verificationStatus: verification.status,
            };
        } catch (error) {
            console.error("Twilio send error:", error);
            return {
                status: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to send verification code",
            };
        }
    },
});

/**
 * Verify OTP via Twilio Verify Service
 */
export const verifyTwilioOtp = action({
    args: {
        phoneNumber: v.string(),
        code: v.string(),
    },
    handler: async (ctx, { phoneNumber, code }) => {
        const client = getTwilioClient();

        try {
            const verificationCheck = await client.verify.v2
                .services(verifyServiceSid)
                .verificationChecks.create({
                    to: phoneNumber,
                    code: code,
                });

            console.log("Twilio verification check:", verificationCheck.status);

            const res = await ctx.runMutation(
                internal.lib.internalMuts.auth.updatePhoneVerificationCodeEntry,
                {
                    phoneNumber,
                },
            );

            if (!res.status) {
                console.error(
                    "Failed to update phone verification code entry:",
                    res.error,
                );
                throw new CustomError(
                    "Failed to update phone verification code entry",
                );
            }

            return {
                success: verificationCheck.status === "approved",
                status: verificationCheck.status,
            };
        } catch (error) {
            console.error("Twilio verify error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to verify code",
            };
        }
    },
});
