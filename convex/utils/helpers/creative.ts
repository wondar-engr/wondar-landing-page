import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const getSkillNames = async (
    ctx: QueryCtx,
    skillIds: Id<"serviceCategories">[],
) => {
    const skillNames = await Promise.all(
        skillIds.map(skillId =>
            ctx.db
                .query("serviceCategories")
                .withIndex("by_id", q => q.eq("_id", skillId))
                .first()
                .then(cat => cat?.name ?? ""),
        ),
    );
    return skillNames;
};
