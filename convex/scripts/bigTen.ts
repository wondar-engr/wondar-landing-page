import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { MutationCtx } from "../_generated/server";
import { BIG_TEN_ROSTER, RosterEntry } from "../bigTen/roster";
import { EMAIL_GAP_MS } from "../bigTen/config";

const args = { email: v.string(), firstName: v.optional(v.string()) };

export const sendTestWelcome = internalMutation({
    args,
    handler: async (ctx, { email, firstName }) => {
        await ctx.scheduler.runAfter(0, internal.email.sendBigTenWelcome, {
            email: email.trim().toLowerCase(),
            firstName,
        });
    },
});

export const sendTestGuide = internalMutation({
    args,
    handler: async (ctx, { email, firstName }) => {
        await ctx.scheduler.runAfter(0, internal.email.sendBigTenGuide, {
            email: email.trim().toLowerCase(),
            firstName,
        });
    },
});

// ── Bulk sends for the Big Ten list ───────────────────────────────
// Run from the Convex dashboard (Functions → scripts/bigTen):
//   sendAllWelcome  { "dryRun": false }
//   sendAllGuide    { "dryRun": false }
// Leave dryRun out (or true) to only preview who would receive it.
// To send to a few people, pass their emails: { "only": ["a@x.com"], "dryRun": false }

const BIG_TEN_TESTERS = BIG_TEN_ROSTER;

// Resend allows about 2 requests a second, so each email goes out 1.5s after the last
const SEND_GAP_MS = EMAIL_GAP_MS;

const bulkArgs = {
    dryRun: v.optional(v.boolean()), // defaults to true
    only: v.optional(v.array(v.string())), // limit to these emails
};

function pickRecipients(only: string[] | undefined): RosterEntry[] {
    if (!only) return BIG_TEN_TESTERS;

    const wanted = new Set(only.map(e => e.trim().toLowerCase()));
    const found = BIG_TEN_TESTERS.filter(t =>
        wanted.has(t.email.toLowerCase()),
    );
    const unknown = [...wanted].filter(
        e => !found.some(t => t.email.toLowerCase() === e),
    );
    if (unknown.length > 0) {
        throw new Error(`Not in the Big Ten list: ${unknown.join(", ")}`);
    }
    return found;
}

// Records the send on the tester's row in the admin, when they're on it
async function stampSent(
    ctx: MutationCtx,
    email: string,
    field: "welcomeSentAt" | "guideSentAt",
) {
    const tester = await ctx.db
        .query("bigTenTesters")
        .withIndex("by_email", q => q.eq("email", email.trim().toLowerCase()))
        .unique();
    if (tester) await ctx.db.patch(tester._id, { [field]: Date.now() });
}

export const sendAllWelcome = internalMutation({
    args: bulkArgs,
    handler: async (ctx, { dryRun = true, only }) => {
        const recipients = pickRecipients(only);

        if (!dryRun) {
            for (const [i, t] of recipients.entries()) {
                await ctx.scheduler.runAfter(
                    i * SEND_GAP_MS,
                    internal.email.sendBigTenWelcome,
                    {
                        email: t.email.trim().toLowerCase(),
                        firstName: t.firstName,
                    },
                );
                await stampSent(ctx, t.email, "welcomeSentAt");
            }
        }

        return {
            dryRun,
            email: "welcome",
            count: recipients.length,
            recipients: recipients.map(t => `${t.firstName} <${t.email}>`),
        };
    },
});

export const sendAllGuide = internalMutation({
    args: bulkArgs,
    handler: async (ctx, { dryRun = true, only }) => {
        const recipients = pickRecipients(only);

        // The guide email attaches the PDF, so fail now instead of eleven
        // scheduled sends failing quietly
        if (
            !dryRun &&
            !(
                process.env.BIG_TEN_GUIDE_PDF_URL ??
                process.env.BETA_TEST_GUIDE_PDF_URL
            )
        ) {
            throw new Error("BIG_TEN_GUIDE_PDF_URL is not set");
        }

        if (!dryRun) {
            for (const [i, t] of recipients.entries()) {
                await ctx.scheduler.runAfter(
                    i * SEND_GAP_MS,
                    internal.email.sendBigTenGuide,
                    {
                        email: t.email.trim().toLowerCase(),
                        firstName: t.firstName,
                    },
                );
                await stampSent(ctx, t.email, "guideSentAt");
            }
        }

        return {
            dryRun,
            email: "guide",
            count: recipients.length,
            recipients: recipients.map(t => `${t.firstName} <${t.email}>`),
        };
    },
});

// Adds the Big Ten list to the admin's Big Ten page. Safe to run again:
// existing testers are left alone and only missing ones are added.
//   seedRoster {}
export const seedRoster = internalMutation({
    args: {},
    handler: async ctx => {
        const added: string[] = [];

        for (const entry of BIG_TEN_ROSTER) {
            const email = entry.email.trim().toLowerCase();
            const existing = await ctx.db
                .query("bigTenTesters")
                .withIndex("by_email", q => q.eq("email", email))
                .unique();
            if (existing) continue;

            await ctx.db.insert("bigTenTesters", {
                email,
                firstName: entry.firstName,
                role: entry.role,
                note: entry.note,
                confirmed: false,
                readyToTest: false,
                results: {
                    registration: "PENDING",
                    access: "PENDING",
                    core: "PENDING",
                    navigation: "PENDING",
                },
                remindersMuted: false,
                updatedAt: Date.now(),
            });
            added.push(entry.firstName);
        }

        return { added, total: BIG_TEN_ROSTER.length };
    },
});
