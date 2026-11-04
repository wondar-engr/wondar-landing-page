import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface BigTenMessageEmailProps {
    firstName?: string;
    subject: string;
    body: string; // plain text; blank lines start a new paragraph
}

// A free-form note from the Wondar team, wrapped in the standard layout.
// Used for messages typed in the admin and for the daily check-in reminder.
export const BigTenMessageEmail = ({
    firstName,
    subject,
    body,
}: BigTenMessageEmailProps) => {
    const paragraphs = body
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    return (
        <EmailLayout preview={subject}>
            <Section style={{ padding: "8px 0 0" }}>
                <Text style={paragraph}>Hi {firstName || "there"},</Text>
                {paragraphs.map((text, i) => (
                    <Text key={i} style={paragraph}>
                        {text.split("\n").map((line, j, lines) => (
                            <React.Fragment key={j}>
                                {line}
                                {j < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </Text>
                ))}
                <Text style={signature}>— The Wondar Team</Text>
            </Section>
        </EmailLayout>
    );
};

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

export default BigTenMessageEmail;
