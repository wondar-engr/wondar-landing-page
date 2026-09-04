import { Heading, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface TesterRejectionEmailProps {
    firstName: string;
}

export const TesterRejectionEmail = ({
    firstName,
}: TesterRejectionEmailProps) => (
    <EmailLayout
        preview={`An update on your Wondar beta application, ${firstName}`}
    >
        <Section style={hero}>
            <Text style={emoji}>💚</Text>
            <Heading style={heading}>Thank you for applying</Heading>
        </Section>

        <Text style={para}>Hey {firstName},</Text>
        <Text style={para}>
            We really appreciate your interest in testing Wondar. Unfortunately,
            we&apos;ve reached capacity for this round of beta testing and
            aren&apos;t able to add you right now.
        </Text>

        <Section style={card}>
            <Text style={cardTitle}>What happens next</Text>
            <Text style={cardBody}>
                We&apos;re keeping your details on file. As we open up more
                spots — which we expect to do soon — you&apos;ll be one of the
                first people we reach out to. You don&apos;t need to reapply.
            </Text>
        </Section>

        <Text style={para}>
            In the meantime, you can still join our waitlist at{" "}
            <a href="https://wondarapp.com" style={linkStyle}>
                wondarapp.com
            </a>{" "}
            to stay updated on our launch.
        </Text>

        <Hr style={divider} />
        <Text style={closing}>
            Thank you again — we hope to have you in the next round. 🙏
        </Text>
        <Text style={sig}>— The Wondar Team</Text>
    </EmailLayout>
);

const hero = { textAlign: "center" as const, padding: "24px 0 28px" };
const emoji = { fontSize: "44px", margin: "0 0 12px" };
const heading = {
    color: "#1A2E1A",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0",
};
const para = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};
const card = {
    backgroundColor: "#f8fdf8",
    borderRadius: "16px",
    padding: "20px 24px",
    margin: "20px 0",
};
const cardTitle = {
    color: "#2D5A3D",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 8px",
};
const cardBody = {
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
};
const linkStyle = { color: "#2D5A3D", fontWeight: "600" };
const divider = { borderColor: "#e5e7eb", margin: "24px 0" };
const closing = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 4px",
};
const sig = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};

export default TesterRejectionEmail;
