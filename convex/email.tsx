import "./polyfills";
import VerifyEmail from "./utils/emails/verifyEmail";
import MagicLinkEmail from "./utils/emails/magicLink";
import VerifyOTP from "./utils/emails/verifyOTP";
import { render } from "@react-email/components";
import ResetPasswordEmail from "./utils/emails/resetPassword";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { type ActionCtx } from "./_generated/server";

// 1. Get the key from environment variables
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
}

export const resend = new Resend(components.resend, {
    testMode: false,
    apiKey,
});

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
