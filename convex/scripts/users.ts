import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { getStripe } from "../lib/stripe";

/**
 * Moves an account to a new email address, keeping the same user, bookings,
 * payments and reports. Run from the Convex dashboard (production) as
 * scripts/users:changeEmail
 *
 *   { "from": "old@hotmail.com", "to": "new@wondarapp.com" }          (dry run)
 *   { "from": "old@hotmail.com", "to": "new@wondarapp.com", "dryRun": false }
 *
 * The sign-in record, profile, reports and Big Ten row change in one
 * transaction: all of them or none. The Stripe customer email is updated
 * right after, which can't be part of that transaction.
 */

const clean = (email: string) => email.trim().toLowerCase();

// Written out on purpose. The action below calls the mutation through
// `internal` in this same file, so letting TypeScript infer these return
// types makes it loop back on itself ("implicitly has type any").
type EmailChangeReport = {
    applied: boolean;
    userId: string;
    name: string;
    from: string;
    to: string;
    feedbackReports: number;
    bigTenTester: boolean;
    stripeCustomerId: string | null;
    hasStripeConnectAccount: boolean;
};

export const applyEmailChange = internalMutation({
    args: { from: v.string(), to: v.string(), dryRun: v.boolean() },
    handler: async (ctx, args): Promise<EmailChangeReport> => {
        const from = clean(args.from);
        const to = clean(args.to);

        if (!/^\S+@\S+\.\S+$/.test(to)) throw new Error("Invalid new email.");
        if (from === to) throw new Error("The two emails are the same.");

        // The account being moved
        const authUser = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            { model: "user", where: [{ field: "email", value: from }] },
        );
        if (!authUser) throw new Error(`No sign-in account for ${from}`);

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_email", q => q.eq("email", from))
            .first();
        if (!profile) throw new Error(`No profile for ${from}`);
        if (profile.userId !== authUser._id) {
            throw new Error(
                "Profile and sign-in account don't match. Stopping.",
            );
        }

        // The new address must be free
        const takenAuth = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            { model: "user", where: [{ field: "email", value: to }] },
        );
        const takenProfile = await ctx.db
            .query("profiles")
            .withIndex("by_email", q => q.eq("email", to))
            .first();
        if (takenAuth || takenProfile) {
            throw new Error(`${to} already belongs to an account.`);
        }

        const reports = await ctx.db
            .query("feedbackReports")
            .withIndex("by_email", q => q.eq("email", from))
            .collect();
        const tester = await ctx.db
            .query("bigTenTesters")
            .withIndex("by_email", q => q.eq("email", from))
            .unique();
        const customer = await ctx.db
            .query("stripeCustomers")
            .withIndex("by_userId", q => q.eq("userId", profile.userId))
            .first();
        const connectAccount = await ctx.db
            .query("stripeAccounts")
            .withIndex("by_userId", q => q.eq("userId", profile.userId))
            .first();

        const report = {
            userId: profile.userId,
            name: [profile.firstName, profile.lastName]
                .filter(Boolean)
                .join(" "),
            from,
            to,
            feedbackReports: reports.length,
            bigTenTester: Boolean(tester),
            stripeCustomerId: customer?.stripeCustomerId ?? null,
            hasStripeConnectAccount: Boolean(connectAccount),
        };

        if (args.dryRun) return { applied: false, ...report };

        const now = Date.now();
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
                model: "user",
                where: [{ field: "email", value: from }],
                update: { email: to, emailVerified: true, updatedAt: now },
            },
        });
        await ctx.db.patch(profile._id, { email: to, updatedAt: now });
        for (const r of reports) await ctx.db.patch(r._id, { email: to });
        if (tester) {
            await ctx.db.patch(tester._id, { email: to, updatedAt: now });
        }
        if (customer) await ctx.db.patch(customer._id, { email: to });

        return { applied: true, ...report };
    },
});

export const changeEmail = internalAction({
    args: {
        from: v.string(),
        to: v.string(),
        dryRun: v.optional(v.boolean()), // defaults to true
    },
    handler: async (
        ctx,
        args,
    ): Promise<EmailChangeReport & { stripe: string; note: string }> => {
        const dryRun = args.dryRun ?? true;
        const result: EmailChangeReport = await ctx.runMutation(
            internal.scripts.users.applyEmailChange,
            { from: args.from, to: args.to, dryRun },
        );

        let stripe = "not needed";
        if (result.applied && result.stripeCustomerId) {
            try {
                await getStripe().customers.update(result.stripeCustomerId, {
                    email: clean(args.to),
                });
                stripe = "customer email updated";
            } catch (error) {
                stripe = `FAILED, update it in Stripe by hand: ${String(error)}`;
            }
        }

        return {
            ...result,
            stripe,
            note: dryRun ? "Dry run. Nothing was changed." : "Done.",
        };
    },
});
