import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "../../auth";
import { CustomError } from "../../utils/errorUtils";

export const addServiceCategory = mutation({
    args: {
        name: v.string(),
        image: v.string(),
    },
    handler: async (ctx, { name, image }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("Unauthorized");
            }

            const existingCategory = await ctx.db
                .query("serviceCategories")
                .withIndex("byName", q => q.eq("name", name))
                .first();

            if (existingCategory) {
                throw new CustomError("Category with this name already exists");
            }

            // Get the highest rank to place new category at the end
            const allCategories = await ctx.db
                .query("serviceCategories")
                .collect();
            const maxRank = allCategories.reduce(
                (max, cat) => Math.max(max, cat.rank ?? 0),
                0,
            );

            const categoryId = await ctx.db.insert("serviceCategories", {
                name,
                image,
                status: true, // Active by default
                rank: maxRank + 1,
            });

            return {
                status: true,
                data: categoryId,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to add category.",
            };
        }
    },
});

export const updateServiceCategory = mutation({
    args: {
        id: v.id("serviceCategories"),
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        status: v.optional(v.boolean()),
        rank: v.optional(v.number()),
    },
    handler: async (ctx, { id, name, image, status, rank }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("Unauthorized");
            }

            const existing = await ctx.db.get(id);
            if (!existing) {
                throw new CustomError("Category not found");
            }

            // If name is being changed, check for duplicates
            if (name && name !== existing.name) {
                const duplicate = await ctx.db
                    .query("serviceCategories")
                    .withIndex("byName", q => q.eq("name", name))
                    .first();

                if (duplicate) {
                    throw new CustomError(
                        "Category with this name already exists",
                    );
                }
            }

            // Build update object with only provided fields
            const updates: Partial<{
                name: string;
                image: string;
                status: boolean;
                rank: number;
            }> = {};

            if (name !== undefined) updates.name = name;
            if (image !== undefined) updates.image = image;
            if (status !== undefined) updates.status = status;
            if (rank !== undefined) updates.rank = rank;

            await ctx.db.patch(id, updates);

            return {
                status: true,
                data: id,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update category.",
            };
        }
    },
});

export const disableServiceCategory = mutation({
    args: {
        id: v.id("serviceCategories"),
    },
    handler: async (ctx, { id }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("Unauthorized");
            }

            const existing = await ctx.db.get(id);
            if (!existing) {
                throw new CustomError("Category not found");
            }

            await ctx.db.patch(id, {
                status: false,
            });

            return {
                status: true,
                data: id,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to disable category.",
            };
        }
    },
});

export const swapCategoryRanks = mutation({
    args: {
        categoryId: v.id("serviceCategories"),
        targetCategoryId: v.id("serviceCategories"),
    },
    handler: async (ctx, { categoryId, targetCategoryId }) => {
        try {
            const userId = await getAuthUserId(ctx);
            if (!userId) {
                throw new CustomError("Unauthorized");
            }

            const category = await ctx.db.get(categoryId);
            const targetCategory = await ctx.db.get(targetCategoryId);

            if (!category || !targetCategory) {
                throw new CustomError("One or both categories not found");
            }

            // Swap the ranks
            const categoryRank = category.rank;
            const targetRank = targetCategory.rank;

            await ctx.db.patch(categoryId, { rank: targetRank });
            await ctx.db.patch(targetCategoryId, { rank: categoryRank });

            return {
                status: true,
            };
        } catch (err: unknown) {
            console.log("[ERR]:", err);
            return {
                status: false,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to reorder categories.",
            };
        }
    },
});

export const getServiceCategories = query({
    args: {
        includeDisabled: v.optional(v.boolean()),
    },
    handler: async (ctx, { includeDisabled }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        let categories = await ctx.db.query("serviceCategories").collect();

        // Filter out disabled unless explicitly requested
        if (!includeDisabled) {
            categories = categories.filter(cat => cat.status !== false);
        }

        // Sort by rank (ascending - lower rank = higher priority)
        categories.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

        return categories;
    },
});
