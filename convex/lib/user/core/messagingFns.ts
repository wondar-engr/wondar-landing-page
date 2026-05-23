import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";

// ── Get or create conversation ────────────────────────────────────
export const getOrCreateConversation = mutation({
    args: {
        otherUserId: v.string(),
        bookingId: v.optional(v.id("bookings")),
    },
    handler: async (ctx, { otherUserId, bookingId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Check if conversation already exists between these two
        const asP1 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", q =>
                q.eq("unreadCounts.participant1.userId", userId),
            )
            .collect();

        const existing = asP1.find(
            c => c.unreadCounts.participant2.userId === otherUserId,
        );

        if (existing) return { conversationId: existing._id };

        // Check the other direction
        const asP2 = await ctx.db
            .query("conversations")
            .withIndex("by_participant2", q =>
                q.eq("unreadCounts.participant2.userId", userId),
            )
            .collect();

        const existingReverse = asP2.find(
            c => c.unreadCounts.participant1.userId === otherUserId,
        );

        if (existingReverse) return { conversationId: existingReverse._id };

        // Create new
        const conversationId = await ctx.db.insert("conversations", {
            participantIds: [userId, otherUserId],
            bookingId,
            unreadCounts: {
                participant1: { userId, count: 0 },
                participant2: { userId: otherUserId, count: 0 },
            },
        });

        return { conversationId };
    },
});

// ── Get my conversations (paginated) ─────────────────────────────
export const getMyConversations = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, { paginationOpts }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { page: [], isDone: true, continueCursor: "" };

        // Get as participant1
        const asP1 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", q =>
                q.eq("unreadCounts.participant1.userId", userId),
            )
            .collect();

        // Get as participant2
        const asP2 = await ctx.db
            .query("conversations")
            .withIndex("by_participant2", q =>
                q.eq("unreadCounts.participant2.userId", userId),
            )
            .collect();

        const all = [...asP1, ...asP2].sort(
            (a, b) =>
                (b.lastMessageAt ?? b._creationTime) -
                (a.lastMessageAt ?? a._creationTime),
        );

        // Manual pagination
        const numItems = paginationOpts.numItems ?? 20;
        // Simple cursor — index into sorted array
        const startIndex = paginationOpts.cursor
            ? all.findIndex(c => c._id === paginationOpts.cursor) + 1
            : 0;

        const page = all.slice(startIndex, startIndex + numItems);
        const isDone = startIndex + numItems >= all.length;
        const continueCursor = isDone ? "" : (page[page.length - 1]?._id ?? "");

        // Enrich with other participant profile
        const enriched = await Promise.all(
            page.map(async conv => {
                const otherUserId =
                    conv.unreadCounts.participant1.userId === userId
                        ? conv.unreadCounts.participant2.userId
                        : conv.unreadCounts.participant1.userId;

                let bookingOrderNo: string | undefined;
                let bookingServiceName: string | undefined;
                let bookingStatus: string | undefined;

                const otherProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", otherUserId))
                    .first();

                const myUnread =
                    conv.unreadCounts.participant1.userId === userId
                        ? conv.unreadCounts.participant1.count
                        : conv.unreadCounts.participant2.count;

                if (conv.bookingId) {
                    const booking = await ctx.db.get(conv.bookingId);
                    if (booking) {
                        bookingOrderNo = booking.orderNo;
                        bookingStatus = booking.status;
                        const service = await ctx.db.get(booking.serviceId);
                        bookingServiceName = service?.name;
                    }
                }
                return {
                    ...conv,
                    otherUser: {
                        userId: otherUserId,
                        firstName: otherProfile?.firstName ?? "",
                        lastName: otherProfile?.lastName ?? "",
                        avatar: otherProfile?.avatar,
                    },
                    myUnreadCount: myUnread,
                    bookingOrderNo,
                    bookingServiceName,
                    bookingStatus,
                };
            }),
        );

        return { page: enriched, isDone, continueCursor };
    },
});

// ── Get messages (paginated) ──────────────────────────────────────
export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { conversationId, paginationOpts }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { page: [], isDone: true, continueCursor: "" };

        const result = await ctx.db
            .query("messages")
            .withIndex("by_conversation_time", q =>
                q.eq("conversationId", conversationId),
            )
            .order("desc") // newest first — FlatList inverted
            .paginate(paginationOpts);

        return result;
    },
});

// ── Send message ──────────────────────────────────────────────────
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        text: v.string(),
        replyTo: v.optional(
            v.object({
                messageId: v.id("messages"),
                senderId: v.string(),
                preview: v.string(),
            }),
        ),
    },
    handler: async (ctx, { conversationId, text, replyTo }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const conv = await ctx.db.get(conversationId);
        if (!conv) throw new Error("Conversation not found");

        const isParticipant = conv.participantIds.includes(userId);
        if (!isParticipant) throw new Error("Not authorized");

        const now = Date.now();
        const preview = text.length > 60 ? text.slice(0, 60) + "…" : text;

        const messageId = await ctx.db.insert("messages", {
            conversationId,
            senderId: userId,
            type: "TEXT",
            text,
            replyTo,
            readBy: [userId],
            createdAt: now,
        });

        // Update conversation last message + increment other user's unread
        const isP1 = conv.unreadCounts.participant1.userId === userId;
        await ctx.db.patch(conversationId, {
            lastMessageAt: now,
            lastMessagePreview: preview,
            lastMessageSenderId: userId,
            unreadCounts: {
                participant1: isP1
                    ? conv.unreadCounts.participant1 // sender — no change
                    : {
                          userId: conv.unreadCounts.participant1.userId,
                          count: conv.unreadCounts.participant1.count + 1,
                      },
                participant2: !isP1
                    ? conv.unreadCounts.participant2 // sender — no change
                    : {
                          userId: conv.unreadCounts.participant2.userId,
                          count: conv.unreadCounts.participant2.count + 1,
                      },
            },
        });

        // Push notification to other participant
        const otherUserId = isP1
            ? conv.unreadCounts.participant2.userId
            : conv.unreadCounts.participant1.userId;

        const senderProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        const senderName = senderProfile
            ? `${senderProfile.firstName ?? ""} ${senderProfile.lastName ?? ""}`.trim()
            : "Someone";

        await sendNotification(ctx, {
            userId: otherUserId,
            title: senderName,
            body: preview,
            type: "MESSAGE",
            meta: {
                screen: "conversation",
                id: conversationId,
            },
            metaUser: userId,
        });

        return { messageId };
    },
});

// ── Send image message ────────────────────────────────────────────
export const sendImageMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        imageUrl: v.string(),
    },
    handler: async (ctx, { conversationId, imageUrl }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const conv = await ctx.db.get(conversationId);
        if (!conv) throw new Error("Conversation not found");
        if (!conv.participantIds.includes(userId))
            throw new Error("Not authorized");

        const now = Date.now();
        const isP1 = conv.unreadCounts.participant1.userId === userId;

        const messageId = await ctx.db.insert("messages", {
            conversationId,
            senderId: userId,
            type: "IMAGE",
            imageUrl,
            readBy: [userId],
            createdAt: now,
        });

        await ctx.db.patch(conversationId, {
            lastMessageAt: now,
            lastMessagePreview: "📷 Photo",
            lastMessageSenderId: userId,
            unreadCounts: {
                participant1: isP1
                    ? conv.unreadCounts.participant1
                    : {
                          userId: conv.unreadCounts.participant1.userId,
                          count: conv.unreadCounts.participant1.count + 1,
                      },
                participant2: !isP1
                    ? conv.unreadCounts.participant2
                    : {
                          userId: conv.unreadCounts.participant2.userId,
                          count: conv.unreadCounts.participant2.count + 1,
                      },
            },
        });

        return { messageId };
    },
});

// ── Mark conversation read ────────────────────────────────────────
export const markConversationRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const conv = await ctx.db.get(conversationId);
        if (!conv) return;

        const isP1 = conv.unreadCounts.participant1.userId === userId;

        await ctx.db.patch(conversationId, {
            unreadCounts: {
                participant1: isP1
                    ? { userId, count: 0 }
                    : conv.unreadCounts.participant1,
                participant2: !isP1
                    ? { userId, count: 0 }
                    : conv.unreadCounts.participant2,
            },
        });
    },
});

// ── Get total unread count (for drawer badge) ─────────────────────
export const getTotalUnreadCount = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;

        const asP1 = await ctx.db
            .query("conversations")
            .withIndex("by_participant1", q =>
                q.eq("unreadCounts.participant1.userId", userId),
            )
            .collect();

        const asP2 = await ctx.db
            .query("conversations")
            .withIndex("by_participant2", q =>
                q.eq("unreadCounts.participant2.userId", userId),
            )
            .collect();

        const total = [
            ...asP1.map(c => c.unreadCounts.participant1.count),
            ...asP2.map(c => c.unreadCounts.participant2.count),
        ].reduce((sum, n) => sum + n, 0);

        return total;
    },
});

export const setTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
        isTyping: v.boolean(),
    },
    handler: async (ctx, { conversationId, isTyping }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return;

        const conv = await ctx.db.get(conversationId);
        if (!conv || !conv.participantIds.includes(userId)) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversation_user", q =>
                q.eq("conversationId", conversationId).eq("userId", userId),
            )
            .first();

        if (isTyping) {
            const expiresAt = Date.now() + 4000; // 4s TTL
            if (existing) {
                await ctx.db.patch(existing._id, { expiresAt });
            } else {
                await ctx.db.insert("typingIndicators", {
                    conversationId,
                    userId,
                    expiresAt,
                });
            }
        } else {
            if (existing) await ctx.db.delete(existing._id);
        }
    },
});

export const getTypingUsers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const now = Date.now();
        const indicators = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversation", q =>
                q.eq("conversationId", conversationId),
            )
            .collect();

        // Filter out expired + filter out self
        return indicators
            .filter(i => i.userId !== userId && i.expiresAt > now)
            .map(i => i.userId);
    },
});
