import { query } from "../../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../../auth";

export const listIncomingQuotes = query({
    handler: async ctx => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) return [];

        const quotes = await ctx.db
            .query("quotes")
            .withIndex("by_creativeId", q => q.eq("creativeId", creativeId))
            .order("desc")
            .collect();

        const enriched = await Promise.all(
            quotes.map(async quote => {
                const clientProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", quote.clientId))
                    .first();

                return {
                    ...quote,
                    clientName: clientProfile
                        ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
                        : "Unknown Client",
                };
            }),
        );

        return enriched;
    },
});

export const getPendingQuotesCount = query({
    handler: async ctx => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) return 0;

        const quotes = await ctx.db
            .query("quotes")
            .withIndex("by_creativeId", q => q.eq("creativeId", creativeId))
            .collect();

        return quotes.filter(
            q => q.status === "PENDING" || q.status === "CLIENT_FINAL",
        ).length;
    },
});

// ADD to existing file
export const getIncomingQuoteDetail = query({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const creativeId = await getAuthUserId(ctx);
        if (!creativeId) throw new Error("Not authenticated");

        const quote = await ctx.db.get(args.quoteId);
        if (!quote || quote.creativeId !== creativeId) {
            throw new Error("Quote not found");
        }

        const offers = await ctx.db
            .query("quoteOffers")
            .withIndex("by_quoteId", q => q.eq("quoteId", args.quoteId))
            .order("asc")
            .collect();

        const clientProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", quote.clientId))
            .first();

        const client = clientProfile
            ? {
                  firstName: clientProfile.firstName,
                  lastName: clientProfile.lastName,
                  avatar: clientProfile.avatar,
                  email: clientProfile.email,
              }
            : null;
        return { quote, offers, client };
    },
});
