import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";

// ── Get my client profile ─────────────────────────────────────────
export const getMyClientProfile = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();
    },
});

// ── Update base profile (name + avatar) ───────────────────────────
export const updateClientProfile = mutation({
    args: {
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

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
    },
});

// ── Update company info ───────────────────────────────────────────
export const updateCompanyInfo = mutation({
    args: {
        companyName: v.optional(v.string()),
        aboutCompany: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const clientProfile = await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!clientProfile) throw new Error("Client profile not found");

        await ctx.db.patch(clientProfile._id, {
            ...(args.companyName !== undefined && {
                companyName: args.companyName,
            }),
            ...(args.aboutCompany !== undefined && {
                aboutCompany: args.aboutCompany,
            }),
        });
    },
});

// ── Update personal address ───────────────────────────────────────
export const updatePersonalAddress = mutation({
    args: {
        personalAddress: v.object({
            address: v.string(),
            city: v.string(),
            state: v.string(),
            zipCode: v.string(),
            lat: v.optional(v.number()),
            lng: v.optional(v.number()),
        }),
    },
    handler: async (ctx, { personalAddress }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const clientProfile = await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!clientProfile) throw new Error("Client profile not found");

        await ctx.db.patch(clientProfile._id, { personalAddress });
    },
});

// ── Update favorite categories ────────────────────────────────────
export const updateFavoriteCategories = mutation({
    args: {
        categories: v.array(v.id("serviceCategories")),
    },
    handler: async (ctx, { categories }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        if (categories.length === 0) {
            throw new Error("Select at least one category");
        }

        const clientProfile = await ctx.db
            .query("clientProfiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!clientProfile) throw new Error("Client profile not found");

        await ctx.db.patch(clientProfile._id, {
            favoriteCategories: categories,
        });
    },
});
