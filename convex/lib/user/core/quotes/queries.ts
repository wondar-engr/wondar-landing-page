import { query } from "../../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../../auth";

export const listMyQuotes = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        let quotes = await ctx.db
            .query("quotes")
            .withIndex("by_clientId", q => q.eq("clientId", userId))
            .order("desc")
            .collect();

        if (args.status) {
            quotes = quotes.filter(q => q.status === args.status);
        }

        // ADD — enrich each with creative business name
        const enriched = await Promise.all(
            quotes.map(async quote => {
                const creativeBusinessDoc = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", quote.creativeId),
                    )
                    .first();

                return {
                    ...quote,
                    creativeBusinessName: creativeBusinessDoc?.businessName,
                };
            }),
        );

        return enriched;
    },
});

export const getQuoteDetail = query({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const quote = await ctx.db.get(args.quoteId);
        if (!quote) return null;
        if (quote.clientId !== userId && quote.creativeId !== userId) {
            return null;
        }

        const offers = await ctx.db
            .query("quoteOffers")
            .withIndex("by_quoteId", q => q.eq("quoteId", args.quoteId))
            .order("asc")
            .collect();

        // ADD — fetch creative identity
        const [creativeProfileDoc, creativeBusinessDoc] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", quote.creativeId))
                .first(),
            ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", quote.creativeId))
                .first(),
        ]);

        const creative = creativeProfileDoc
            ? {
                  firstName: creativeProfileDoc.firstName,
                  lastName: creativeProfileDoc.lastName,
                  avatar: creativeProfileDoc.avatar,
                  businessName: creativeBusinessDoc?.businessName,
              }
            : null;

        return { quote, offers, creative };
    },
});
