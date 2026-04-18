import { render } from "@react-email/components";
import { WelcomeEmail } from "./welcomeEmail";
import { ClientOnboardingCompleteEmail } from "./clientOnboardingEmail";

export type EmailTemplate =
    | "welcome"
    | "client-onboarding-complete"
    | "creative-onboarding-complete";

interface EmailData {
    firstName: string;
    email: string;
    selectedRole?: "CLIENT" | "CREATIVE";
}

export const getEmailContent = async (
    template: EmailTemplate,
    data: EmailData,
): Promise<{ subject: string; html: string }> => {
    switch (template) {
        case "welcome":
            return {
                subject: `Welcome to Wondar, ${data.firstName}! 🎉`,
                html: await render(
                    WelcomeEmail({
                        firstName: data.firstName,
                        selectedRole: data.selectedRole || "CLIENT",
                    }),
                ),
            };

        case "client-onboarding-complete":
            return {
                subject: `You're all set to discover amazing creatives! 🎊`,
                html: await render(
                    ClientOnboardingCompleteEmail({
                        firstName: data.firstName,
                    }),
                ),
            };

        default:
            throw new Error(`Unknown email template: ${template}`);
    }
};
