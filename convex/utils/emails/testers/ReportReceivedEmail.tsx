import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface ReportReceivedEmailProps {
    name?: string;
    title: string;
    isIdea: boolean;
}

// Sent when someone uses the website contact form, so they know it landed
export const ReportReceivedEmail = ({
    name,
    title,
    isIdea,
}: ReportReceivedEmailProps) => (
    <EmailLayout preview="We got your message and we're on it">
        <Section style={{ padding: "8px 0 0" }}>
            <Text style={paragraph}>Hi {name || "there"},</Text>
            <Text style={paragraph}>
                Thanks for reaching out. We&apos;ve received your{" "}
                {isIdea ? "suggestion" : "report"} and our team is looking into
                it.
            </Text>
            <Section style={card}>
                <Text style={cardLabel}>What you sent</Text>
                <Text style={cardTitle}>{title}</Text>
            </Section>
            <Text style={paragraph}>
                We&apos;ll follow up at this email address once we know more. If
                you remember anything else, such as what you were doing when it
                happened, just reply to this email.
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
const card = {
    backgroundColor: "#f8fdf8",
    borderRadius: "16px",
    padding: "16px 20px",
    margin: "8px 0 20px",
};
const cardLabel = {
    color: "#2D5A3D",
    fontSize: "12px",
    fontWeight: "700",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
};
const cardTitle = {
    color: "#1A2E1A",
    fontSize: "15px",
    margin: "0",
};
const signature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "8px 0 0",
};

export default ReportReceivedEmail;
