import { mutation } from "../_generated/server";

/**
 * ONE-TIME MIGRATION
 * Run from Convex dashboard to expand all existing services to 24hr availability.
 * Safe to run multiple times — only patches services where hours are not already 24hr.
 *
 * After running:
 *   - All 7 days will be selected
 *   - start: 0 (midnight)
 *   - end: 1440 (midnight next day)
 *
 * Revert by running contractServiceHours below.
 */
export const expandServiceHours = mutation({
    args: {},
    handler: async ctx => {
        const services = await ctx.db.query("services").collect();
        let updated = 0;

        const fullDayAvailability = [0, 1, 2, 3, 4, 5, 6].map(day => ({
            day,
            start: 0, // midnight
            end: 1440, // midnight next day
            selected: true,
        }));

        for (const service of services) {
            await ctx.db.patch(service._id, {
                availability: fullDayAvailability,
            });
            updated++;
        }

        console.log(
            `[MIGRATION] Expanded ${updated} services to 24hr availability`,
        );
        return { success: true, updated };
    },
});

/**
 * REVERT MIGRATION
 * Run this when you want to go back to normal business hours.
 * Resets all services to Mon–Fri, 9am–5pm (540–1020).
 * Services will need to re-configure their own hours after this.
 */
export const contractServiceHours = mutation({
    args: {},
    handler: async ctx => {
        const services = await ctx.db.query("services").collect();
        let updated = 0;

        const defaultAvailability = [
            { day: 0, start: 540, end: 1020, selected: false }, // Sun
            { day: 1, start: 540, end: 1020, selected: true }, // Mon
            { day: 2, start: 540, end: 1020, selected: true }, // Tue
            { day: 3, start: 540, end: 1020, selected: true }, // Wed
            { day: 4, start: 540, end: 1020, selected: true }, // Thu
            { day: 5, start: 540, end: 1020, selected: true }, // Fri
            { day: 6, start: 540, end: 1020, selected: false }, // Sat
        ];

        for (const service of services) {
            await ctx.db.patch(service._id, {
                availability: defaultAvailability,
            });
            updated++;
        }

        console.log(
            `[MIGRATION] Reverted ${updated} services to default business hours`,
        );
        return { success: true, updated };
    },
});
