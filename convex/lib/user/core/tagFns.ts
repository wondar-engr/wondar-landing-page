import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";

const TAG_REGEX = /^[a-z0-9_]{3,20}$/;

// ── Check availability ────────────────────────────────────────────
export const checkTagAvailability = query({
    args: { tag: v.string() },
    handler: async (ctx, { tag }) => {
        const normalized = tag.toLowerCase().trim();

        if (!TAG_REGEX.test(normalized)) {
            return {
                available: false,
                error: "3–20 characters. Letters, numbers and underscores only.",
            };
        }

        const userId = await getAuthUserId(ctx);

        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_tag", q => q.eq("tag", normalized))
            .first();

        // Available if no one has it, or if the current user already owns it
        const available = !existing || existing.userId === userId;

        return {
            available,
            error: available ? null : "This tag is already taken.",
        };
    },
});

// ── Update tag ────────────────────────────────────────────────────
export const updateTag = mutation({
    args: { tag: v.string() },
    handler: async (ctx, { tag }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const normalized = tag.toLowerCase().trim();

        if (!TAG_REGEX.test(normalized)) {
            throw new Error(
                "3–20 characters. Letters, numbers and underscores only.",
            );
        }

        // Check it's not taken by someone else
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_tag", q => q.eq("tag", normalized))
            .first();

        if (existing && existing.userId !== userId) {
            throw new Error("This tag is already taken.");
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!profile) throw new Error("Profile not found");

        await ctx.db.patch(profile._id, {
            tag: normalized,
            updatedAt: Date.now(),
        });

        return { success: true, tag: normalized };
    },
});

// ── Get my tag ────────────────────────────────────────────────────
export const getMyTag = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        return profile?.tag ?? null;
    },
});

// ── Search by tag (for discovery + mentions) ─────────────────────
export const searchByTag = query({
    args: { partial: v.string() },
    handler: async (ctx, { partial }) => {
        const normalized = partial.toLowerCase().trim().replace(/^@/, "");
        if (normalized.length < 2) return [];

        // Fetch all and filter — Convex doesn't support startsWith index
        // but tag searches are short bursts, not continuous
        const all = await ctx.db
            .query("profiles")
            .withIndex("by_tag")
            .collect();

        return all
            .filter(p => p.tag?.startsWith(normalized))
            .slice(0, 10)
            .map(p => ({
                userId: p.userId,
                tag: p.tag,
                firstName: p.firstName,
                lastName: p.lastName,
                avatar: p.avatar,
            }));
    },
});
