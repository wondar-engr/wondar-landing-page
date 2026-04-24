import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { nanoid } from "nanoid";
import { WaitlistInterestUnion } from "../../../convex/unions";
import { api, internal } from "../../_generated/api";

// Generate a unique referral code
function generateReferralCode(): string {
    return `WND-${nanoid(8).toUpperCase()}`;
}

// Join the waitlist
export const join = mutation({
    args: {
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        interestedAs: v.optional(WaitlistInterestUnion),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        referredBy: v.optional(v.string()), // Referral code
    },
    handler: async (ctx, args) => {
        try {
            const referredBy = args.referredBy
                ? args.referredBy.toUpperCase()
                : undefined;
            // Check if email already exists
            const existing = await ctx.db
                .query("waitlist")
                .withIndex("by_email", q =>
                    q.eq("email", args.email.toLowerCase()),
                )
                .first();

            if (existing) {
                return {
                    success: false,
                    error: "already_exists",
                    message: "This email is already on the waitlist!",
                    position: existing.position,
                    referralCode: existing.referralCode,
                };
            }

            // Validate referral code if provided
            let validReferral = false;
            if (referredBy) {
                const referrer = await ctx.db
                    .query("waitlist")
                    .withIndex("by_referralCode", q =>
                        q.eq("referralCode", referredBy),
                    )
                    .first();

                if (referrer) {
                    validReferral = true;
                    // Increment referrer's count
                    const newReferralCount = referrer.referralCount + 1;

                    // Move referrer up 5 spots for each referral
                    const newPosition = Math.max(1, referrer.position - 5);

                    await ctx.db.patch(referrer._id, {
                        referralCount: newReferralCount,
                        position: newPosition,
                    });
                }
            }

            // Get current highest position
            const lastEntry = await ctx.db
                .query("waitlist")
                .withIndex("by_position")
                .order("desc")
                .first();

            const position = lastEntry ? lastEntry.position + 1 : 1;
            const referralCode = generateReferralCode();
            const referralLink =
                `${process.env.WEBSITE_URL}?ref=${referralCode}` ||
                `https://wondarapp.com?ref=${referralCode}`;
            // Create waitlist entry
            const id = await ctx.db.insert("waitlist", {
                email: args.email.toLowerCase(),
                firstName: args.firstName,
                lastName: args.lastName,
                position,
                referralCode,
                referredBy: validReferral ? referredBy : undefined,
                referralCount: 0,
                status: "PENDING",
                interestedAs: args.interestedAs || "BOTH",
                city: args.city,
                state: args.state,
                createdAt: Date.now(),
            });

            await ctx.scheduler.runAfter(
                0,
                api.lib.emailActions.sendWaitlistConfirmationEmailAction,
                {
                    to: args.email,
                    firstName: args.firstName || "",
                    position,
                    referralCode,
                    referralLink,
                },
            );

            const telegramText = [
                `New Waitlist Signup!`,
                `─────────────────`,
                `✉️ Email: ${args.email.toLowerCase()}`,
                `─────────────────`,
                `📈 Position: #${position}`,
                `🎟️ Referral Code: ${referralCode}`,
                `🔗 Referred By: ${validReferral ? `\`${referredBy}\`` : "None"}`,
                `─────────────────`,
                `🚀 Total Signups: ${position} Users`,
            ].join("\n");

            await ctx.scheduler.runAfter(
                0,
                internal.lib.appActions.notifications.sendTelegramNotification,
                {
                    text: telegramText,
                },
            );

            return {
                success: true,
                id,
                position,
                referralCode,
                totalSignups: position,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error: err instanceof Error ? err.message : "Failed to .",
            };
        }
    },
});

// Get waitlist position by email
export const getPosition = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("waitlist")
            .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
            .first();

        if (!entry) {
            return null;
        }

        // Get total count for context
        const total = await ctx.db
            .query("waitlist")
            .withIndex("by_status", q => q.eq("status", "PENDING"))
            .collect();

        return {
            position: entry.position,
            referralCode: entry.referralCode,
            referralCount: entry.referralCount,
            status: entry.status,
            totalPending: total.length,
        };
    },
});

// Get waitlist stats (for admin/landing page)
export const getStats = query({
    args: {},
    handler: async ctx => {
        const all = await ctx.db.query("waitlist").collect();

        const stats = {
            total: all.length,
            pending: all.filter(e => e.status === "PENDING").length,
            invited: all.filter(e => e.status === "INVITED").length,
            joined: all.filter(e => e.status === "JOINED").length,
            clients: all.filter(e => e.interestedAs === "CLIENT").length,
            creatives: all.filter(e => e.interestedAs === "CREATIVE").length,
            both: all.filter(e => e.interestedAs === "BOTH").length,
        };

        return stats;
    },
});

// Unsubscribe from waitlist
export const unsubscribe = mutation({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("waitlist")
            .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
            .first();

        if (!entry) {
            return { success: false, error: "not_found" };
        }

        await ctx.db.patch(entry._id, {
            status: "UNSUBSCRIBED",
        });

        return { success: true };
    },
});

// Mark as invited (admin action)
export const markInvited = mutation({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("waitlist")
            .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
            .first();

        if (!entry) {
            return { success: false, error: "not_found" };
        }

        await ctx.db.patch(entry._id, {
            status: "INVITED",
            invitedAt: Date.now(),
        });

        return { success: true };
    },
});

// Mark as joined (when user creates account)
export const markJoined = mutation({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("waitlist")
            .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
            .first();

        if (!entry) {
            return { success: false, error: "not_found" };
        }

        await ctx.db.patch(entry._id, {
            status: "JOINED",
            joinedAt: Date.now(),
        });

        return { success: true };
    },
});
