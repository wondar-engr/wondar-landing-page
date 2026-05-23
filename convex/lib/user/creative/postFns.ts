import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { paginationOptsValidator } from "convex/server";

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
