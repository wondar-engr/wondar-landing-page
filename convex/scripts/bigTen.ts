import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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

type Tester = { email: string; firstName: string; note: string };

const BIG_TEN_TESTERS: Tester[] = [
    {
        email: "soulfullyplantd@gmail.com",
        firstName: "Lamisha",
        note: "influencer/culinary",
    },
    {
        email: "Ciaraward22@gmail.com",
        firstName: "Ciara",
        note: "influencer/podcast host",
    },
    {
        email: "wlaquinn@yahoo.com",
        firstName: "Laquinn",
        note: "barber/influencer/rapper",
    },
    {
        email: "dylanthagoat100@gmail.com",
        firstName: "Dylan",
        note: "influencer/pod host",
    },
    {
        email: "chidiebere19800@gmail.com",
        firstName: "Chidi",
        note: "influencer/podcast host",
    },
    {
        email: "Mariej_eustache@yahoo.com",
        firstName: "Josee",
        note: "actress/model/podcast host/influencer",
    },
    {
        email: "Tieharri@yahoo.com",
        firstName: "Tierra",
        note: "app user/author/client",
    },
    {
        email: "deshyaeasley123@gmail.com",
        firstName: "Deshya",
        note: "hair dresser",
    },
    {
        email: "ayannawardlow@gmail.com",
        firstName: "Yanni",
        note: "model/influencer/actress",
    },
    {
        email: "aniyah87915@gmail.com",
        firstName: "Aniyah",
        note: "illustrator",
    },
    {
        email: "saltdesignandetc@gmail.com",
        firstName: "Stephanie",
        note: "custom apparel and wood worker",
    },
];

// Resend allows about 2 requests a second, so each email goes out 1.5s after the last
const SEND_GAP_MS = 1500;

const bulkArgs = {
    dryRun: v.optional(v.boolean()), // defaults to true
    only: v.optional(v.array(v.string())), // limit to these emails
};

function pickRecipients(only: string[] | undefined): Tester[] {
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
