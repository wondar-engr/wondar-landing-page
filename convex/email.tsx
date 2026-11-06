import "./polyfills";
import VerifyEmail from "./utils/emails/verifyEmail";
import MagicLinkEmail from "./utils/emails/magicLink";
import VerifyOTP from "./utils/emails/verifyOTP";
import { render } from "@react-email/components";
import ResetPasswordEmail from "./utils/emails/resetPassword";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { TesterWelcomeEmail } from "./utils/emails/testers/TesterWelcomeEmail";
import { TesterConfirmationEmail } from "./utils/emails/testers/TesterConfirmationEmail";
import React from "react";
import TesterRejectionEmail from "./utils/emails/testers/TesterRejectionEmail";
import { DeletionRequestEmail } from "./utils/emails/deletion/DeletionRequestEmail";
import BigTenGuideEmail from "./utils/emails/testers/BigTenGuideEmail";
import BigTenWelcomeEmail from "./utils/emails/testers/BigTenWelcomeEmail";
import { redirectEmailPayload, withDevRedirect } from "./utils/devMode";
import ReportReceivedEmail from "./utils/emails/testers/ReportReceivedEmail";
import BigTenMessageEmail from "./utils/emails/testers/BigTenMessageEmail";

const PDF_URL = process.env.BETA_TEST_GUIDE_PDF_URL;
const BIG_TEN_GUIDE_URL = process.env.BIG_TEN_GUIDE_PDF_URL ?? PDF_URL;
const BIG_TEN_HERO_URL = process.env.BIG_TEN_HERO_IMAGE_URL;

// 1. Get the key from environment variables
const apiKey = process.env.RESEND_API_KEY;

const FROM = "Wondar <noreply@wondarapp.com>";
// Big Ten replies go to the contact inbox, with engineering copied in
const BIG_TEN_REPLY_TO = ["contact@wondarapp.com", "engineer@wondarapp.com"];

if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
}

export const resend = withDevRedirect(
    new Resend(components.resend, {
        testMode: false,
        apiKey,
    }),
);

async function send(
    ctx: Parameters<typeof resend.sendEmail>[0],
    {
        to,
        subject,
        jsx,
    }: { to: string; subject: string; jsx: React.ReactElement },
) {
    await resend.sendEmail(ctx, {
        from: FROM,
        to,
        subject,
        html: await render(jsx),
    });
}

export const sendEmailVerification = async (
    ctx: ActionCtx,
    {
        to,
        url,
    }: {
        to: string;
        url: string;
    },
) => {
    await resend.sendEmail(ctx, {
        from: "Wondar <auth@wondarapp.com>",
        to,
        subject: "Verify your email address",
        html: await render(<VerifyEmail url={url} />),
    });
};

export const sendOTPVerification = async (
    ctx: ActionCtx,
    {
        to,
        code,
    }: {
        to: string;
        code: string;
    },
) => {
    await resend.sendEmail(ctx, {
        from: "Wondar <auth@wondarapp.com>",
        to,
        subject: "Verify your email address",
        html: await render(<VerifyOTP code={code} />),
    });
};

export const sendMagicLink = async (
    ctx: ActionCtx,
    {
        to,
        url,
    }: {
        to: string;
        url: string;
    },
) => {
    await resend.sendEmail(ctx, {
        from: "Wondar <auth@wondarapp.com>",
        to,
        subject: "Sign in to your account",
        html: await render(<MagicLinkEmail url={url} />),
    });
};

export const sendResetPassword = async (
    ctx: ActionCtx,
    {
        to,
        url,
    }: {
        to: string;
        url: string;
    },
) => {
    await resend.sendEmail(ctx, {
        from: "Wondar <auth@wondarapp.com>",
        to,
        subject: "Reset your password",
        html: await render(<ResetPasswordEmail url={url} />),
    });
};

export const sendTesterConfirmation = internalAction({
    args: {
        firstName: v.string(),
        email: v.string(),
        primaryRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
        deviceOs: v.union(
            v.literal("IOS"),
            v.literal("ANDROID"),
            v.literal("BOTH"),
        ),
    },
    handler: async (ctx, args) => {
        await send(ctx, {
            to: args.email,
            subject: "We got your request — Wondar Beta",
            jsx: React.createElement(TesterConfirmationEmail, {
                firstName: args.firstName,
                primaryRole: args.primaryRole,
                deviceOs: args.deviceOs,
            }),
        });
    },
});

export const sendTesterWelcome = internalAction({
    args: {
        firstName: v.string(),
        email: v.string(),
        primaryRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
        deviceOs: v.union(
            v.literal("IOS"),
            v.literal("ANDROID"),
            v.literal("BOTH"),
        ),
    },
    handler: async (ctx, args) => {
        const { Resend } = await import("resend");

        const resend = new Resend(process.env.RESEND_API_KEY);

        const html = await render(
            React.createElement(TesterWelcomeEmail, {
                firstName: args.firstName,
                primaryRole: args.primaryRole,
                deviceOs: args.deviceOs,
            }),
        );

        await resend.emails.send(
            redirectEmailPayload({
                from: FROM,
                to: args.email,
                subject: "You're in! Here's how to get started on Wondar 🎉",
                html,
                attachments: [
                    {
                        filename: "wondar_beta_onboarding_guide.pdf",
                        path: PDF_URL,
                    },
                ],
            }),
        );
    },
});

export const sendTesterRejection = internalAction({
    args: {
        firstName: v.string(),
        email: v.string(),
    },
    handler: async (ctx, args) => {
        await send(ctx, {
            to: args.email,
            subject: "An update on your Wondar beta application",
            jsx: React.createElement(TesterRejectionEmail, {
                firstName: args.firstName,
            }),
        });
    },
});

export const sendDeletionConfirmation = internalAction({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        await send(ctx, {
            to: args.email,
            subject: "We received your Wondar account deletion request",
            jsx: React.createElement(DeletionRequestEmail),
        });
    },
});

// ── Wondar Big Ten: email 1 (welcome) and email 2 (guide) ─────────
const bigTenArgs = { email: v.string(), firstName: v.optional(v.string()) };

export const sendBigTenWelcome = internalAction({
    args: bigTenArgs,
    handler: async (ctx, args) => {
        await resend.sendEmail(ctx, {
            from: FROM,
            replyTo: BIG_TEN_REPLY_TO,
            to: args.email,
            subject: "Welcome to the Wondar Big Ten 🎉",
            html: await render(
                React.createElement(BigTenWelcomeEmail, {
                    firstName: args.firstName,
                    heroImageUrl: BIG_TEN_HERO_URL,
                }),
            ),
        });
    },
});

export const sendBigTenGuide = internalAction({
    args: bigTenArgs,
    handler: async (ctx, args) => {
        if (!BIG_TEN_GUIDE_URL) {
            throw new Error("BIG_TEN_GUIDE_PDF_URL is not set");
        }
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const html = await render(
            React.createElement(BigTenGuideEmail, {
                firstName: args.firstName ?? "there",
            }),
        );

        await resend.emails.send(
            redirectEmailPayload({
                from: FROM,
                replyTo: BIG_TEN_REPLY_TO,
                to: args.email,
                subject: "Your Wondar Big Ten starter guide",
                html,
                attachments: [
                    {
                        filename: "wondar_big_ten_guide.pdf",
                        path: BIG_TEN_GUIDE_URL,
                    },
                ],
            }),
        );
    },
});

// A free-form note to one Big Ten tester (typed in the admin, or the daily
// check-in reminder), inside the standard email layout
export const sendBigTenMessage = internalAction({
    args: {
        email: v.string(),
        firstName: v.optional(v.string()),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        await resend.sendEmail(ctx, {
            from: FROM,
            replyTo: BIG_TEN_REPLY_TO,
            to: args.email,
            subject: args.subject,
            html: await render(
                React.createElement(BigTenMessageEmail, {
                    firstName: args.firstName,
                    subject: args.subject,
                    body: args.body,
                }),
            ),
        });
    },
});

// Confirmation to someone who used the website contact form
export const sendReportReceived = internalAction({
    args: {
        email: v.string(),
        name: v.optional(v.string()),
        title: v.string(),
        isIdea: v.boolean(),
    },
    handler: async (ctx, args) => {
        await resend.sendEmail(ctx, {
            from: FROM,
            replyTo: BIG_TEN_REPLY_TO,
            to: args.email,
            subject: "We got your message — Wondar",
            html: await render(
                React.createElement(ReportReceivedEmail, {
                    name: args.name,
                    title: args.title,
                    isIdea: args.isIdea,
                }),
            ),
        });
    },
});
