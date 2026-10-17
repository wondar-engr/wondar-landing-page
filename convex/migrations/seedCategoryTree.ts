import { internalMutation } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { CATEGORY_TREE, ADDITIONS } from "../data/categoryTree";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const seedCategoryTree = internalMutation({
    args: {
        dryRun: v.optional(v.boolean()), // defaults to true
        createNew: v.optional(v.boolean()), // defaults to false: also create the ADDITIONS rows
    },
    handler: async (ctx, { dryRun = true, createNew = false }) => {
        const existing = await ctx.db.query("serviceCategories").collect();
        const rowsByName = new Map<string, Doc<"serviceCategories">[]>();
        for (const c of existing) {
            const k = norm(c.name);
            rowsByName.set(k, [...(rowsByName.get(k) ?? []), c]);
        }

        // name -> every group it belongs to
        const wanted = new Map<
            string,
            { name: string; slugs: Set<string>; core: boolean }
        >();
        const want = (name: string, slug: string, core: boolean) => {
            const k = norm(name);
            const w = wanted.get(k) ?? { name, slugs: new Set<string>(), core };
            w.slugs.add(slug);
            w.core = w.core || core;
            wanted.set(k, w);
        };
        CATEGORY_TREE.forEach(g => g.items.forEach(i => want(i, g.slug, true)));
        ADDITIONS.forEach(a => a.slugs.forEach(s => want(a.name, s, false)));

        const report = {
            groupsToCreate: [] as string[],
            matched: 0,
            duplicateRows: [] as string[],
            unmatchedTreeNames: [] as string[], // should be empty: a typo or a missing row
            additionsSkipped: [] as string[],
            toCreate: [] as string[],
            unmatchedExisting: [] as string[], // old rows that will show under "Other"
        };

        // 1. Groups
        const groupIdBySlug = new Map<string, Id<"categoryGroups">>();
        for (let i = 0; i < CATEGORY_TREE.length; i++) {
            const g = CATEGORY_TREE[i];
            const doc = await ctx.db
                .query("categoryGroups")
                .withIndex("by_slug", q => q.eq("slug", g.slug))
                .first();

            if (doc) {
                groupIdBySlug.set(g.slug, doc._id);
                if (!dryRun)
                    await ctx.db.patch(doc._id, {
                        name: g.name,
                        sortOrder: i * 10,
                    });
            } else {
                report.groupsToCreate.push(g.name);
                if (!dryRun) {
                    const id = await ctx.db.insert("categoryGroups", {
                        name: g.name,
                        slug: g.slug,
                        sortOrder: i * 10,
                    });
                    groupIdBySlug.set(g.slug, id);
                }
            }
        }

        // 2. Categories
        let nextRank = existing.reduce((m, c) => Math.max(m, c.rank), 0) + 1;

        for (const [key, w] of wanted) {
            const rows = rowsByName.get(key) ?? [];
            const groupIds = [...w.slugs]
                .map(s => groupIdBySlug.get(s))
                .filter((id): id is Id<"categoryGroups"> => !!id);

            if (rows.length === 0) {
                if (w.core) {
                    report.unmatchedTreeNames.push(w.name);
                    continue;
                }
                if (!createNew) {
                    report.additionsSkipped.push(w.name);
                    continue;
                }
                report.toCreate.push(w.name);
                if (!dryRun) {
                    await ctx.db.insert("serviceCategories", {
                        name: w.name,
                        groupIds,
                        rank: nextRank++,
                        status: true,
                    });
                }
                continue;
            }

            report.matched++;
            if (rows.length > 1)
                report.duplicateRows.push(`${w.name} (${rows.length} rows)`);
            if (!dryRun) {
                for (const r of rows) await ctx.db.patch(r._id, { groupIds });
            }
        }

        report.unmatchedExisting = existing
            .filter(c => !wanted.has(norm(c.name)))
            .map(c => c.name);

        return { dryRun, createNew, ...report };
    },
});
