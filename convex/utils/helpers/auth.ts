import { QueryCtx, MutationCtx } from "../../_generated/server";
import { authComponent } from "../../auth";

export async function getAuthUserId(
    ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
    try {
        const user = await authComponent.getAuthUser(ctx);
        return user?._id ?? null;
    } catch {
        return null;
    }
}

export async function requireAuthUserId(
    ctx: QueryCtx | MutationCtx,
): Promise<string> {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    return userId;
}

export async function getAuthUserProfile(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .first();
}

export async function requireAuthUserProfile(ctx: QueryCtx | MutationCtx) {
    const profile = await getAuthUserProfile(ctx);
    if (!profile) throw new Error("Account not found.");
    return profile;
}

export async function requireAdminProfile(ctx: QueryCtx | MutationCtx) {
    const profile = await requireAuthUserProfile(ctx);
    if (profile.role !== "ADMIN")
        throw new Error("Unauthorized. Admin access required.");
    return profile;
}
