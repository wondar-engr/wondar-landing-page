import { query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { v } from "convex/values";

export const getServiceCategoriesByIds = query({
    args: {
        ids: v.array(v.id("serviceCategories")),
    },
    handler: async (ctx, { ids }) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) return null;

        const categories = await Promise.all(ids.map(id => ctx.db.get(id)));

        return categories.filter(cat => cat !== null);
    },
});

export const getServiceCategoryById = query({
    args: {
        id: v.id("serviceCategories"),
    },
    handler: async (ctx, { id }) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) return null;

        const category = await ctx.db.get(id);

        if (!category) return null;

        return category;
    },
});
