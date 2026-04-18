import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { CustomError } from "../../utils/errorUtils";
import { authComponent, getAuthUserId } from "../../auth";

export const completeProfile = mutation({
    args: {
        firstName: v.string(),
        lastName: v.string(),
        phoneNumber: v.string(),
    },
    async handler(ctx, args) {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("User not authenticated");
            }
            const user = await authComponent.getAuthUser(ctx);

            if (!user) {
                throw new CustomError("User not authenticated");
            }

            const email = user.email || null;

            if (!email) {
                throw new CustomError("Email not found for authenticated user");
            }

            const existingProfile = await ctx.db
                .query("profiles")
                .filter(q => q.eq(q.field("userId"), userId))
                .unique();

            if (existingProfile) {
                throw new CustomError("Profile already exists for this user");
            }

            const existingEmailProfile = await ctx.db
                .query("profiles")
                .filter(q => q.eq(q.field("email"), email))
                .unique();

            if (existingEmailProfile) {
                throw new CustomError(
                    "Email is already associated with another account",
                );
            }

            const existingPhoneProfile = await ctx.db
                .query("profiles")
                .filter(q => q.eq(q.field("phoneNumber"), args.phoneNumber))
                .unique();

            if (existingPhoneProfile) {
                throw new CustomError(
                    "Phone number is already associated with another account",
                );
            }

            await ctx.db.insert("profiles", {
                userId,
                firstName: args.firstName,
                lastName: args.lastName,
                email: email, // You can choose to store email here or fetch it from auth data
                accountStatus: "ACTIVE",
                currentType: "CLIENT",
                role: "ADMIN",
                totalRating: 0,
                lastKnownLocation: {
                    lat: 0,
                    lng: 0,
                    timestamp: Date.now(),
                },
                onboarding: {
                    profileComplete: true,
                    clientComplete: false,
                    creativeComplete: false,
                },
                phoneNumber: args.phoneNumber,
                phoneVerified: false, // Set to true after phone verification
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
                        : "Failed to complete profile.",
            };
        }
    },
});
