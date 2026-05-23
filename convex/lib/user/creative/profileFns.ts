import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";

// ── Get my creative profile ───────────────────────────────────────
export const getMyCreativeProfile = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});

// ── Update base profile (name, bio, avatar, cover) ────────────────
export const updateProfile = mutation({
    args: {
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        aboutMe: v.optional(v.string()),
        avatar: v.optional(v.string()),
        coverImage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        // Update profiles table
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!profile) throw new Error("Profile not found");

        await ctx.db.patch(profile._id, {
            ...(args.firstName !== undefined && { firstName: args.firstName }),
            ...(args.lastName !== undefined && { lastName: args.lastName }),
            ...(args.avatar !== undefined && { avatar: args.avatar }),
            updatedAt: Date.now(),
        });

        // Update creativeProfiles table for bio + cover
        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!creativeProfile) throw new Error("Creative profile not found");

        await ctx.db.patch(creativeProfile._id, {
            ...(args.aboutMe !== undefined && { aboutMe: args.aboutMe }),
            ...(args.coverImage !== undefined && {
                coverImage: args.coverImage,
            }),
        });
    },
});

// ── Update business info ──────────────────────────────────────────
export const updateBusinessInfo = mutation({
    args: {
        businessName: v.string(),
        workAddress: v.object({
            address: v.string(),
            city: v.string(),
            state: v.string(),
            zipCode: v.string(),
            lat: v.number(),
            lng: v.number(),
        }),
        willingToTravel: v.optional(v.boolean()),
        travelRadius: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!creativeProfile) throw new Error("Creative profile not found");

        await ctx.db.patch(creativeProfile._id, {
            businessName: args.businessName,
            workAddress: args.workAddress,
            willingToTravel: args.willingToTravel,
            travelRadius: args.travelRadius,
        });
    },
});

// ── Update skills ─────────────────────────────────────────────────
export const updateSkills = mutation({
    args: {
        skills: v.array(v.id("serviceCategories")),
    },
    handler: async (ctx, { skills }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const creativeProfile = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!creativeProfile) throw new Error("Creative profile not found");

        await ctx.db.patch(creativeProfile._id, { skills });
    },
});
