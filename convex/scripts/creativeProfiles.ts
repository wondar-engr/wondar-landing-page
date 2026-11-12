import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Turns "Accept Custom Quotes" on for creatives who never chose a value.
 * New creatives now start with it on; this fixes the ones made before that.
 * Creatives who switched it off on purpose (false) are left alone.
 * Run from the Convex dashboard (each deployment) as
 * scripts/creativeProfiles:backfillAcceptsQuotes
 *
 *   {}                      (dry run, changes nothing)
 *   { "dryRun": false }
 */
export const backfillAcceptsQuotes = internalMutation({
    args: { dryRun: v.optional(v.boolean()) },
    handler: async (ctx, { dryRun = true }) => {
        const profiles = await ctx.db.query("creativeProfiles").collect();
        const unset = profiles.filter(p => p.acceptsQuotes === undefined);

        if (!dryRun) {
            for (const p of unset) {
                await ctx.db.patch(p._id, { acceptsQuotes: true });
            }
        }

        return {
            applied: !dryRun,
            total: profiles.length,
            updated: unset.length,
            alreadySet: profiles.length - unset.length,
        };
    },
});
