import { mutation, query } from "../../../_generated/server";
import { getAuthUserId } from "../../../auth";
import { ServiceStatusUnion, ServiceTravelOptionUnion } from "../../../unions";
import { v } from "convex/values";

// ==================== MUTATIONS ====================

/**
 * Create a new service
 */
export const createService = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        categoryId: v.id("serviceCategories"),
        tags: v.array(v.string()),
        paymentSystem: v.union(v.literal("HOURLY"), v.literal("FLAT")),
        serviceFee: v.number(),
        bookingFee: v.number(),
        travelOption: v.union(
            v.literal("NO_TRAVEL"),
            v.literal("CREATIVE_TRAVELS"),
            v.literal("BOTH"),
        ),
        travelFee: v.number(),
        duration: v.number(),
        bufferTime: v.number(),
        availability: v.array(
            v.object({
                day: v.number(),
                start: v.number(),
                end: v.number(),
                selected: v.boolean(),
            }),
        ),
        banners: v.array(v.string()),
        status: ServiceStatusUnion,
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const serviceId = await ctx.db.insert("services", {
            userId,
            name: args.name,
            description: args.description,
            categoryId: args.categoryId,
            tags: args.tags,
            paymentSystem: args.paymentSystem,
            serviceFee: args.serviceFee,
            bookingFee: args.bookingFee,
            travelOption: args.travelOption,
            travelFee: args.travelFee,
            duration: args.duration,
            bufferTime: args.bufferTime,
            availability: args.availability,
            banners: args.banners,
            status: args.status,
            deleteStatus: false,
            stats: {
                timesOrdered: 0,
                timesCompleted: 0,
                timesCancelled: 0,
                timesRescheduled: 0,
            },
        });

        return { success: true, serviceId };
    },
});

/**
 * Update an existing service
 */
export const updateService = mutation({
    args: {
        serviceId: v.id("services"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id("serviceCategories")),
        tags: v.optional(v.array(v.string())),
        paymentSystem: v.optional(
            v.union(v.literal("HOURLY"), v.literal("FLAT")),
        ),
        serviceFee: v.optional(v.number()),
        bookingFee: v.optional(v.number()),
        travelOption: v.optional(ServiceTravelOptionUnion),
        travelFee: v.optional(v.number()),
        duration: v.optional(v.number()),
        bufferTime: v.optional(v.number()),
        availability: v.optional(
            v.array(
                v.object({
                    day: v.number(),
                    start: v.number(),
                    end: v.number(),
                    selected: v.boolean(),
                }),
            ),
        ),
        banners: v.optional(v.array(v.string())),
        status: v.optional(ServiceStatusUnion),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const { serviceId, ...updates } = args;

        // Verify ownership
        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");
        if (service.userId !== userId) throw new Error("Unauthorized");
        if (service.deleteStatus) throw new Error("Service has been deleted");

        // Build update object (only include provided fields)
        const updateData: Record<string, unknown> = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.categoryId !== undefined)
            updateData.categoryId = updates.categoryId;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.paymentSystem !== undefined)
            updateData.paymentSystem = updates.paymentSystem;
        if (updates.serviceFee !== undefined)
            updateData.serviceFee = updates.serviceFee;
        if (updates.bookingFee !== undefined)
            updateData.bookingFee = updates.bookingFee;
        if (updates.travelOption !== undefined)
            updateData.travelOption = updates.travelOption;
        if (updates.travelFee !== undefined)
            updateData.travelFee = updates.travelFee;
        if (updates.duration !== undefined)
            updateData.duration = updates.duration;
        if (updates.bufferTime !== undefined)
            updateData.bufferTime = updates.bufferTime;
        if (updates.availability !== undefined)
            updateData.availability = updates.availability;
        if (updates.banners !== undefined) updateData.banners = updates.banners;
        if (updates.status !== undefined) updateData.status = updates.status;

        await ctx.db.patch(serviceId, updateData);

        return { success: true, serviceId };
    },
});

/**
 * Soft delete a service
 */
export const deleteService = mutation({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const { serviceId } = args;

        // Verify ownership
        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");
        if (service.userId !== userId) throw new Error("Unauthorized");

        // Soft delete
        await ctx.db.patch(serviceId, {
            deleteStatus: true,
            status: "INACTIVE",
        });

        return { success: true };
    },
});

/**
 * Permanently delete a service (use with caution)
 */
export const permanentlyDeleteService = mutation({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const { serviceId } = args;

        // Verify ownership
        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");
        if (service.userId !== userId) throw new Error("Unauthorized");

        // Check if service has any bookings
        const bookings = await ctx.db
            .query("bookings")
            .filter(q => q.eq(q.field("serviceId"), serviceId))
            .first();

        if (bookings) {
            throw new Error(
                "Cannot permanently delete service with existing bookings",
            );
        }

        await ctx.db.delete(serviceId);

        return { success: true };
    },
});

/**
 * Restore a soft-deleted service
 */
export const restoreService = mutation({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const { serviceId } = args;

        // Verify ownership
        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");
        if (service.userId !== userId) throw new Error("Unauthorized");

        await ctx.db.patch(serviceId, {
            deleteStatus: false,
        });

        return { success: true };
    },
});

/**
 * Duplicate a service
 */
export const duplicateService = mutation({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const { serviceId } = args;

        // Verify ownership
        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");
        if (service.userId !== userId) throw new Error("Unauthorized");

        // Create duplicate
        const newServiceId = await ctx.db.insert("services", {
            userId,
            name: `${service.name} (Copy)`,
            description: service.description,
            categoryId: service.categoryId,
            tags: service.tags,
            paymentSystem: service.paymentSystem,
            serviceFee: service.serviceFee,
            bookingFee: service.bookingFee,
            travelOption: service.travelOption,
            travelFee: service.travelFee,
            duration: service.duration,
            bufferTime: service.bufferTime,
            availability: service.availability,
            banners: service.banners,
            status: "INACTIVE", // Start as draft
            deleteStatus: false,
            stats: {
                timesOrdered: 0,
                timesCompleted: 0,
                timesCancelled: 0,
                timesRescheduled: 0,
            },
        });

        return { success: true, serviceId: newServiceId };
    },
});

// ==================== QUERIES ====================

/**
 * Get a service by ID
 */
export const getServiceById = query({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const service = await ctx.db.get(args.serviceId);

        if (!service || service.deleteStatus) {
            return null;
        }

        return service;
    },
});

/**
 * Get a service by ID with category info (for display)
 */
export const getServiceWithCategory = query({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const service = await ctx.db.get(args.serviceId);

        if (!service || service.deleteStatus) {
            return null;
        }

        const category = await ctx.db.get(service.categoryId);

        return {
            ...service,
            category: category
                ? { _id: category._id, name: category.name }
                : null,
        };
    },
});

/**
 * Get all services for the current user (creative)
 */
export const getMyServices = query({
    args: {
        includeInactive: v.optional(v.boolean()),
        includeDeleted: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const { includeInactive = false, includeDeleted = false } = args;

        let services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .collect();

        // Filter based on options
        if (!includeDeleted) {
            services = services.filter(s => !s.deleteStatus);
        }

        if (!includeInactive) {
            services = services.filter(
                s => s.status === "ACTIVE" || s.deleteStatus,
            );
        }

        // Fetch categories for all services
        const categoryIds = [...new Set(services.map(s => s.categoryId))];
        const categories = await Promise.all(
            categoryIds.map(id => ctx.db.get(id)),
        );
        const categoryMap = new Map(
            categories.filter(Boolean).map(c => [c!._id, c!.name]),
        );

        return services.map(service => ({
            ...service,
            categoryName: categoryMap.get(service.categoryId) || "Unknown",
        }));
    },
});

/**
 * Get active services for a creative (for clients to see)
 */
export const getCreativeServices = query({
    args: {
        creativeId: v.string(),
    },
    handler: async (ctx, args) => {
        const services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", args.creativeId))
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "ACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .collect();

        // Fetch categories
        const categoryIds = [...new Set(services.map(s => s.categoryId))];
        const categories = await Promise.all(
            categoryIds.map(id => ctx.db.get(id)),
        );
        const categoryMap = new Map(
            categories.filter(Boolean).map(c => [c!._id, c!.name]),
        );

        return services.map(service => ({
            ...service,
            categoryName: categoryMap.get(service.categoryId) || "Unknown",
        }));
    },
});

/**
 * Get draft services for the current user
 */
export const getDraftServices = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const drafts = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "INACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .collect();

        return drafts.map(draft => ({
            id: draft._id,
            name: draft.name,
            createdAt: draft._creationTime,
        }));
    },
});

/**
 * Get services by category (for browsing)
 */
export const getServicesByCategory = query({
    args: {
        categoryId: v.id("serviceCategories"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { categoryId, limit = 20 } = args;

        const services = await ctx.db
            .query("services")
            .withIndex("by_category", q => q.eq("categoryId", categoryId))
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "ACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .take(limit);

        return services;
    },
});

/**
 * Search services by name/description
 */
export const searchServices = query({
    args: {
        query: v.string(),
        categoryId: v.optional(v.id("serviceCategories")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { query, categoryId, limit = 20 } = args;
        const searchTerm = query.toLowerCase();

        let services = await ctx.db
            .query("services")
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "ACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .collect();

        // Filter by search term
        services = services.filter(
            s =>
                s.name.toLowerCase().includes(searchTerm) ||
                s.description.toLowerCase().includes(searchTerm) ||
                s.tags.some(t => t.toLowerCase().includes(searchTerm)),
        );

        // Filter by category if provided
        if (categoryId) {
            services = services.filter(s => s.categoryId === categoryId);
        }

        return services.slice(0, limit);
    },
});

/**
 * Get service count for a creative
 */
export const getServiceCount = query({
    args: {
        creativeId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = args.creativeId || (await getAuthUserId(ctx));
        if (!userId) return { total: 0, active: 0, drafts: 0 };

        const services = await ctx.db
            .query("services")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("deleteStatus"), false))
            .collect();

        return {
            total: services.length,
            active: services.filter(s => s.status === "ACTIVE").length,
            drafts: services.filter(s => s.status === "DRAFT").length,
            inactive: services.filter(s => s.status === "INACTIVE").length,
        };
    },
});

/**
 * Get popular services (for homepage/explore)
 */
export const getPopularServices = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { limit = 10 } = args;

        const services = await ctx.db
            .query("services")
            .filter(q =>
                q.and(
                    q.eq(q.field("status"), "ACTIVE"),
                    q.eq(q.field("deleteStatus"), false),
                ),
            )
            .collect();

        // Sort by times ordered (most popular first)
        services.sort((a, b) => b.stats.timesOrdered - a.stats.timesOrdered);

        // Fetch creative profiles for display
        const topServices = services.slice(0, limit);

        const enrichedServices = await Promise.all(
            topServices.map(async service => {
                const creativeProfile = await ctx.db
                    .query("creativeProfiles")
                    .withIndex("by_userId", q => q.eq("userId", service.userId))
                    .unique();

                const category = await ctx.db.get(service.categoryId);

                return {
                    ...service,
                    creative: creativeProfile
                        ? {
                              businessName: creativeProfile.businessName,
                              coverImage: creativeProfile.coverImage,
                          }
                        : null,
                    categoryName: category?.name || "Unknown",
                };
            }),
        );

        return enrichedServices;
    },
});

/**
 * Update service stats (internal use)
 */
export const updateServiceStats = mutation({
    args: {
        serviceId: v.id("services"),
        field: v.union(
            v.literal("timesOrdered"),
            v.literal("timesCompleted"),
            v.literal("timesCancelled"),
            v.literal("timesRescheduled"),
        ),
        increment: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { serviceId, field, increment = 1 } = args;

        const service = await ctx.db.get(serviceId);
        if (!service) throw new Error("Service not found");

        const currentStats = service.stats;
        const newStats = {
            ...currentStats,
            [field]: currentStats[field] + increment,
        };

        await ctx.db.patch(serviceId, { stats: newStats });

        return { success: true };
    },
});
