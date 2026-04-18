import { query } from "../../../_generated/server";
import { v } from "convex/values";

// ==========================================
// GET SERVICE BY ID
// ==========================================

export const getServiceById = query({
    args: {
        serviceId: v.id("services"),
    },
    handler: async (ctx, { serviceId }) => {
        const service = await ctx.db.get(serviceId);

        if (!service) return null;

        // Check if service is active and not deleted
        if (service.status !== "ACTIVE" || service.deleteStatus) {
            return null;
        }

        // Get category name
        const category = await ctx.db.get(service.categoryId);

        return {
            ...service,
            categoryName: category?.name || "Uncategorized",
        };
    },
});
