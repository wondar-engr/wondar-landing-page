import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { ActionCtx, MutationCtx, query, QueryCtx } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { emailOTP } from "better-auth/plugins";
import { resend } from "./email";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth({
        trustedOrigins: [
            "wondarapp://",
            "http://localhost:8081", // Expo Dev Tools
            "exp://192.168.x.x:8081", // Your local IP for physical devices
            // Development mode - Expo's exp:// scheme with local IP ranges
            ...(process.env.NODE_ENV === "development"
                ? [
                      "exp://", // Trust all Expo URLs (prefix matching)
                      "exp://**", // Trust all Expo URLs (wildcard matching)
                      "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
                  ]
                : []),
        ],
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
        },
        plugins: [
            emailOTP({
                async sendVerificationOTP({ email, otp }) {
                    // Reuse your resend helper logic here
                    await resend.sendEmail(requireActionCtx(ctx), {
                        from: "Wondar <auth@wondarapp.com>", // Don't leave empty!
                        to: email,
                        subject: "Your Verification Code",
                        html: `<p>Your code is <b>${otp}</b></p>`,
                    });
                },
            }),
            // The Convex plugin is required for Convex compatibility
            convex({ authConfig }),
        ],
    });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
    args: {},
    handler: async ctx => {
        return authComponent.getAuthUser(ctx);
    },
});

// ADD THIS: A reusable helper for other server functions
export async function getAuthUserId(ctx: MutationCtx | QueryCtx | ActionCtx) {
    try {
        const user = await authComponent.getAuthUser(ctx);
        // Note: Better Auth objects often use .id or ._id depending on the helper
        return user?._id ?? user?._id ?? null;
    } catch (err: unknown) {
        console.log("Auth error:", err);
        // This catches the "Unauthenticated" ConvexError from Better Auth
        return null;
    }
}
