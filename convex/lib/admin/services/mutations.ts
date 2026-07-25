import { v } from "convex/values";
import { mutation } from "@convex/_generated/server";
import { ServiceStatusUnion } from "@convex/unions";
import { requireAdminProfile } from "@convex/utils/helpers/auth";

export const suspendService = mutation({
    args: {
        serviceId: v.id("services"),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdminProfile(ctx);

        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new Error("Service not found");
        if (service.status === "SUSPENDED")
            throw new Error("Already suspended");

        await ctx.db.patch(args.serviceId, {
            status: "SUSPENDED",
            adminSuspension: {
                suspendedBy: admin.userId,
                suspendedAt: Date.now(),
                reason: args.reason,
            },
        });

        return { success: true };
    },
});

export const unsuspendService = mutation({
    args: {
        serviceId: v.id("services"),
        restoreStatus: ServiceStatusUnion,
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new Error("Service not found");
        if (service.status !== "SUSPENDED") throw new Error("Not suspended");
        if (args.restoreStatus === "SUSPENDED")
            throw new Error("Invalid restore status");

        await ctx.db.patch(args.serviceId, {
            status: args.restoreStatus,
            adminSuspension: undefined,
        });

        return { success: true };
    },
});

export const updateServiceStatus = mutation({
    args: {
        serviceId: v.id("services"),
        status: ServiceStatusUnion,
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        if (args.status === "SUSPENDED")
            throw new Error("Use suspendService instead");

        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new Error("Service not found");
        if (service.status === "SUSPENDED")
            throw new Error("Service is suspended. Use unsuspendService.");

        await ctx.db.patch(args.serviceId, { status: args.status });

        return { success: true };
    },
});

export const deleteService = mutation({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        await requireAdminProfile(ctx);

        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new Error("Service not found");

        await ctx.db.patch(args.serviceId, {
            deleteStatus: true,
            status: "INACTIVE",
        });

        return { success: true };
    },
});
