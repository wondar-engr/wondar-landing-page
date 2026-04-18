"use node";

import Twilio from "twilio";
import { action } from "./_generated/server";
import { v } from "convex/values";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

const twilioClient = Twilio(accountSid, authToken);

/**
 * Send OTP via Twilio Verify Service
 */
export const sendPhoneOtp = action({
    args: {
        phoneNumber: v.string(), // E.164 format: +1234567890
    },
    handler: async (ctx, { phoneNumber }) => {
        try {
            const verification = await twilioClient.verify.v2
                .services(verifyServiceSid)
                .verifications.create({
                    to: phoneNumber,
                    channel: "sms",
                });

            console.log("Twilio verification sent:", verification.status);

            return {
                success: true,
                status: verification.status,
            };
        } catch (error) {
            console.error("Twilio send error:", error);
            throw new Error("Failed to send verification code");
        }
    },
});

/**
 * Verify OTP via Twilio Verify Service
 */
export const verifyPhoneOtp = action({
    args: {
        phoneNumber: v.string(),
        code: v.string(),
    },
    handler: async (ctx, { phoneNumber, code }) => {
        try {
            const verificationCheck = await twilioClient.verify.v2
                .services(verifyServiceSid)
                .verificationChecks.create({
                    to: phoneNumber,
                    code: code,
                });

            console.log("Twilio verification check:", verificationCheck.status);

            return {
                success: verificationCheck.status === "approved",
                status: verificationCheck.status,
            };
        } catch (error) {
            console.error("Twilio verify error:", error);
            throw new Error("Failed to verify code");
        }
    },
});
