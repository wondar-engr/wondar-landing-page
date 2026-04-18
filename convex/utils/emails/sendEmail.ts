"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import { getEmailContent, EmailTemplate } from "./emailService";
import { action } from "../../../convex/_generated/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Wondar <hello@wondarapp.com>";
const FROM_EMAIL_DEE = "Dee from Wondar <dee@wondarapp.com>";

export const sendEmail = action({
    args: {
        to: v.string(),
        template: v.union(
            v.literal("welcome"),
            v.literal("client-onboarding-complete"),
            v.literal("creative-onboarding-complete"),
        ),
        data: v.object({
            firstName: v.string(),
            email: v.string(),
            selectedRole: v.optional(
                v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
            ),
        }),
    },
    handler: async (ctx, { to, template, data }) => {
        try {
            const { subject, html } = await getEmailContent(
                template as EmailTemplate,
                data,
            );

            // Use Dee's email for welcome emails (personal touch)
            const fromEmail =
                template === "welcome" ? FROM_EMAIL_DEE : FROM_EMAIL;

            const result = await resend.emails.send({
                from: fromEmail,
                to,
                subject,
                html,
            });

            console.log(`✅ Email sent: ${template} to ${to}`);
            return { success: true, id: result.data?.id };
        } catch (error) {
            console.error(
                `❌ Failed to send email: ${template} to ${to}`,
                error,
            );
            return { success: false, error: String(error) };
        }
    },
});

// Convenience actions for specific emails
// export const sendWelcomeEmail = action({
//     args: {
//         to: v.string(),
//         firstName: v.string(),
//         selectedRole: v.union(v.literal("CLIENT"), v.literal("CREATIVE")),
//     },
//     handler: async (ctx, { to, firstName, selectedRole }) => {
//         return ctx.runAction(sendEmail, {
//             to,
//             template: "welcome",
//             data: { firstName, email: to, selectedRole },
//         });
//     },
// });

// export const sendClientOnboardingCompleteEmail = action({
//     args: {
//         to: v.string(),
//         firstName: v.string(),
//     },
//     handler: async (ctx, { to, firstName }) => {
//         return ctx.runAction(sendEmail, {
//             to,
//             template: "client-onboarding-complete",
//             data: { firstName, email: to },
//         });
//     },
// });

// export const sendCreativeOnboardingCompleteEmail = action({
//     args: {
//         to: v.string(),
//         firstName: v.string(),
//     },
//     handler: async (ctx, { to, firstName }) => {
//         return ctx.runAction(sendEmail, {
//             to,
//             template: "creative-onboarding-complete",
//             data: { firstName, email: to },
//         });
//     },
// });
