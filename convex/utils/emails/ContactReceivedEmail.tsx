import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/emailLayout";

interface ContactReceivedEmailProps {
    name?: string;
}

// Sent when someone uses the website contact form, so they know it landed
export const ContactReceivedEmail = ({
    name,
}: ContactReceivedEmailProps) => (
    <EmailLayout preview="We got your message and we're on it">
        <Section style={{ padding: "8px 0 0" }}>
            <Text style={paragraph}>Hi {name || "there"},</Text>
            <Text style={paragraph}>
                Thanks for reaching out to Wondar. We&apos;ve received your
                message and a member of our team will get back to you at this
                email address soon.
            </Text>
            <Text style={paragraph}>
                If you want to add anything, just reply to this email.
            </Text>
            <Text style={signature}>— The Wondar Team</Text>
        </Section>
    </EmailLayout>
);

const paragraph = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};
const signature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "8px 0 0",
};

export default ContactReceivedEmail;
