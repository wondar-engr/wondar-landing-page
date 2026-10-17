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

export const getAllServiceCategories = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const categories = await ctx.db.query("serviceCategories").collect();

        return categories;
    },
});

export const getCategoryTree = query({
    args: {},
    handler: async ctx => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const [groups, categories] = await Promise.all([
            ctx.db.query("categoryGroups").collect(),
            ctx.db.query("serviceCategories").collect(),
        ]);

        const active = categories.filter(c => c.status !== false); // rows with no status (ranks 5 to 7) count as active

        const byRank = (
            a: { rank: number; name: string },
            b: { rank: number; name: string },
        ) => a.rank - b.rank || a.name.localeCompare(b.name);

        const tree = groups
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(g => ({
                key: g._id as string,
                name: g.name,
                categories: active
                    .filter(c => c.groupIds?.includes(g._id))
                    .sort(byRank),
            }))
            .filter(g => g.categories.length > 0);

        const ungrouped = active.filter(c => !c.groupIds?.length).sort(byRank);
        if (ungrouped.length > 0) {
            tree.push({ key: "other", name: "Other", categories: ungrouped });
        }
        return tree;
    },
});
