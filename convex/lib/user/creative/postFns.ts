import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { paginationOptsValidator } from "convex/server";
import { internal } from "@convex/_generated/api";
import { sendNotification } from "@convex/lib/notifications";

export const createPost = mutation({
    args: {
        caption: v.optional(v.string()),
        media: v.array(
            v.object({
                url: v.string(),
                type: v.union(v.literal("IMAGE"), v.literal("VIDEO")),
            }),
        ),
        serviceId: v.optional(v.id("services")),
        tags: v.array(v.string()),
        visibility: v.union(v.literal("PUBLIC"), v.literal("FOLLOWERS_ONLY")),
    },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        if (args.media.length === 0)
            throw new Error("At least one media item required");
        if (args.media.length > 10) throw new Error("Maximum 10 media items");

        const postId = await ctx.db.insert("posts", {
            creativeId,
            caption: args.caption,
            media: args.media,
            serviceId: args.serviceId,
            tags: args.tags,
            visibility: args.visibility,
            stats: { views: 0, likes: 0 },
            createdAt: Date.now(),
        });

        // After postId is created, fetch creative profile for notification copy
        const creativeProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", creativeId))
            .first();

        const creativeDisplayName =
            (
                await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", creativeId))
                    .first()
            )?.businessName ||
            `${creativeProfile?.firstName ?? ""} ${creativeProfile?.lastName ?? ""}`.trim() ||
            "A creative you support";

        // Get all supporters
        const supporters = await ctx.db
            .query("supports")
            .withIndex("by_supported", q => q.eq("supportedId", creativeId))
            .collect();

        // Send in-app + push to each supporter
        await Promise.all(
            supporters.map(s =>
                sendNotification(ctx, {
                    userId: s.supporterId,
                    title: `${creativeDisplayName} posted something new`,
                    body: args.caption
                        ? args.caption.slice(0, 100)
                        : args.media[0].type === "VIDEO"
                          ? "Posted a new video"
                          : "Posted a new photo",
                    type: "GENERAL",
                    meta: { screen: "post_detail", id: postId },
                }),
            ),
        );

        // Telegram alert for admin awareness
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `📸 NEW POST`,
                    ``,
                    `🎨 Creative: ${creativeDisplayName}`,
                    `👥 Notified: ${supporters.length} supporter${supporters.length !== 1 ? "s" : ""}`,
                    `🔍 Visibility: ${args.visibility}`,
                    args.caption
                        ? `💬 Caption: ${args.caption.slice(0, 80)}`
                        : null,
                    `🆔 Post ID: ${postId}`,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "GENERAL",
            },
        );

        return { postId };
    },
});

export const getMyPosts = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, { paginationOpts }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) return { page: [], isDone: true, continueCursor: "" };

        const result = await ctx.db
            .query("posts")
            .withIndex("by_creative", q => q.eq("creativeId", creativeId))
            .order("desc")
            .paginate(paginationOpts);

        const enriched = await Promise.all(
            result.page.map(async post => {
                const likes = await ctx.db
                    .query("postLikes")
                    .withIndex("by_postId", q => q.eq("postId", post._id))
                    .collect();

                return {
                    ...post,
                    likeCount: likes.length,
                    likedByMe: likes.some(l => l.userId === creativeId),
                };
            }),
        );

        return { ...result, page: enriched };
    },
});

export const getCreativePosts = query({
    args: { creativeId: v.string() },
    handler: async (ctx, { creativeId }) => {
        return ctx.db
            .query("posts")
            .withIndex("by_creative", q => q.eq("creativeId", creativeId))
            .filter(q => q.eq(q.field("visibility"), "PUBLIC"))
            .order("desc")
            .collect();
    },
});

export const deletePost = mutation({
    args: { postId: v.id("posts") },
    handler: async (ctx, { postId }) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const post = await ctx.db.get(postId);
        if (!post) throw new Error("Post not found");
        if (post.creativeId !== creativeId) throw new Error("Not authorized");

        await ctx.db.delete(postId);
        return { success: true };
    },
});
