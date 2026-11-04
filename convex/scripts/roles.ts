import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Run from the Convex dashboard (Functions → scripts/roles):
//   makeSuperAdmin { "email": "you@example.com" }
// This is how the very first super admin is created. After that, super admins
// can change roles from a user's page in the dashboard.
export const makeSuperAdmin = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const normalized = email.trim().toLowerCase();

        const profiles = await ctx.db.query("profiles").collect();
        const profile = profiles.find(
            p => p.email.trim().toLowerCase() === normalized,
        );
        if (!profile) throw new Error(`No account found for ${email}`);

        await ctx.db.patch(profile._id, {
            role: "SUPER_ADMIN",
            updatedAt: Date.now(),
        });

        return { email: profile.email, role: "SUPER_ADMIN" };
    },
});
