import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { ServiceStatusUnion } from "@convex/unions";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

export const getAllServices = query({
    args: {
        status: v.optional(ServiceStatusUnion),
        search: v.optional(v.string()),
        categoryId: v.optional(v.id("serviceCategories")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const limit = args.limit ?? 50;

        let services;

        if (args.status) {
            services = await ctx.db
                .query("services")
                .withIndex("by_status", q =>
                    q.eq("status", args.status!).eq("deleteStatus", false),
                )
                .order("desc")
                .take(limit);
        } else {
            services = await ctx.db.query("services").order("desc").take(limit);
            services = services.filter(s => !s.deleteStatus);
        }

        if (args.search) {
            const q = args.search.toLowerCase();
            services = services.filter(s => s.name.toLowerCase().includes(q));
        }

        if (args.categoryId) {
            services = services.filter(s => s.categoryId === args.categoryId);
        }

        return Promise.all(
            services.map(async s => {
                const category = await ctx.db.get(s.categoryId);
                const creative = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", s.userId))
                    .first();
                const profile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q => q.eq("userId", s.userId))
                    .first();

                return {
                    ...s,
                    category: category ?? null,
                    creative: creative ?? null,
                    profile: profile ?? null,
                };
            }),
        );
    },
});

export const getServiceById = query({
    args: { serviceId: v.id("services") },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const service = await ctx.db.get(args.serviceId);
        if (!service) return null;

        const category = await ctx.db.get(service.categoryId);
        const creative = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", service.userId))
            .first();
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", service.userId))
            .first();

        const recentBookings = await ctx.db
            .query("bookings")
            .withIndex("by_serviceId", q => q.eq("serviceId", args.serviceId))
            .order("desc")
            .take(5);

        return {
            ...service,
            category: category ?? null,
            creative: creative ?? null,
            profile: profile ?? null,
            recentBookings,
        };
    },
});

export const getServiceStats = query({
    args: {},
    handler: async ctx => {
        await requireAdminProfile(ctx);

        const all = await ctx.db
            .query("services")
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        return {
            total: all.length,
            active: all.filter(s => s.status === "ACTIVE").length,
            inactive: all.filter(s => s.status === "INACTIVE").length,
            draft: all.filter(s => s.status === "DRAFT").length,
            suspended: all.filter(s => s.status === "SUSPENDED").length,
        };
    },
});
