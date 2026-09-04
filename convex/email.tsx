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

const PDF_URL = process.env.BETA_TEST_GUIDE_PDF_URL;

// 1. Get the key from environment variables
const apiKey = process.env.RESEND_API_KEY;

const FROM = "Wondar <noreply@wondarapp.com>";

if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
}

export const resend = new Resend(components.resend, {
    testMode: false,
    apiKey,
});

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

        await resend.emails.send({
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
        });
    },
});
