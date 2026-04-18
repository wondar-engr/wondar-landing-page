import { v } from "convex/values";
import { action } from "../_generated/server";
import { resend } from "../email";
import { render } from "@react-email/components";
import { WelcomeEmail } from "../../convex/utils/emails/welcomeEmail";
import ClientOnboardingCompleteEmail from "../../convex/utils/emails/clientOnboardingEmail";
import CreativeOnboardingCompleteEmail from "../../convex/utils/emails/creativeOnboardingEmail";
import WaitlistConfirmationEmail from "../utils/emails/waitlistConfirmationEmail";

export const sendWelcomeEmailAction = action({
    args: {
        to: v.string(),
        firstName: v.string(),
        selectedRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
    },
    handler: async (ctx, args) => {
        const { to, firstName, selectedRole } = args;
        await resend.sendEmail(ctx, {
            from: "Dee <ceo@wondarapp.com>",
            to,
            subject: "Welcome to Wondar",
            html: await render(
                <WelcomeEmail
                    firstName={firstName}
                    selectedRole={selectedRole}
                />,
            ),
        });
    },
});

export const sendClientOnboardingCompleteAction = action({
    args: {
        to: v.string(),
        firstName: v.string(),
    },
    handler: async (ctx, args) => {
        const { to, firstName } = args;
        await resend.sendEmail(ctx, {
            from: "Client <client@wondarapp.com>",
            to,
            subject: "Welcome to Wondar",
            html: await render(
                <ClientOnboardingCompleteEmail firstName={firstName} />,
            ),
        });
    },
});

export const sendCreativeOnboardingCompleteAction = action({
    args: {
        to: v.string(),
        firstName: v.string(),
        businessName: v.string(),
        skillNames: v.array(v.string()), // Array of skill names
    },
    handler: async (ctx, args) => {
        const { to, firstName, businessName, skillNames } = args;

        await resend.sendEmail(ctx, {
            from: "Wondar Creative <creative@wondarapp.com>",
            to,
            subject: `Welcome to Wondar, ${firstName}! Your creative journey starts now 🎨`,
            html: await render(
                <CreativeOnboardingCompleteEmail
                    firstName={firstName}
                    businessName={businessName}
                    skills={skillNames}
                />,
            ),
        });
    },
});

export const sendWaitlistConfirmationEmailAction = action({
    args: {
        to: v.string(),
        firstName: v.string(),
        position: v.number(),
        referralCode: v.string(),
        referralLink: v.string(),
    },
    handler: async (ctx, args) => {
        const { to, firstName, position, referralCode, referralLink } = args;

        await resend.sendEmail(ctx, {
            from: "Wondar App <contact@wondarapp.com>",
            to,
            subject: `You're #${position} on the Wondar waitlist! 🎉`,
            html: await render(
                <WaitlistConfirmationEmail
                    firstName={firstName}
                    position={position}
                    referralCode={referralCode}
                    referralLink={referralLink}
                />,
            ),
        });
    },
});
