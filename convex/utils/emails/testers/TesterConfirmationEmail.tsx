import { Heading, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface TesterConfirmationEmailProps {
    firstName: string;
    primaryRole: "CLIENT" | "CREATIVE";
    deviceOs: "IOS" | "ANDROID" | "BOTH";
}

export const TesterConfirmationEmail = ({
    firstName,
    primaryRole,
    deviceOs,
}: TesterConfirmationEmailProps) => {
    const isCreative = primaryRole === "CREATIVE";

    return (
        <EmailLayout
            preview={`Got it, ${firstName}! We'll be in touch soon with your Wondar beta access.`}
        >
            <Section style={hero}>
                <Text style={emoji}>👋</Text>
                <Heading style={heading}>We got your request!</Heading>
                <Text style={sub}>
                    You&apos;re one step closer to testing Wondar.
                </Text>
            </Section>

            <Text style={para}>Hey {firstName},</Text>
            <Text style={para}>
                Thanks for signing up to be a Wondar beta tester! We&apos;re
                reviewing your details and will reach out very soon with your
                access instructions and everything you need to get started.
            </Text>

            {/* What happens next */}
            <Section style={card}>
                <Text style={cardTitle}>What happens next</Text>
                <Section style={timelineRow}>
                    <Text style={dot}>①</Text>
                    <Text style={timelineText}>
                        <b>We review your details</b> — usually within 1–2
                        business days.
                    </Text>
                </Section>
                <Section style={timelineRow}>
                    <Text style={dot}>②</Text>
                    <Text style={timelineText}>
                        <b>
                            We add you to the{" "}
                            {deviceOs === "IOS"
                                ? "TestFlight"
                                : deviceOs === "ANDROID"
                                  ? "Play Store"
                                  : "TestFlight & Play Store"}{" "}
                            program
                        </b>{" "}
                        — you&apos;ll get an invite from Apple/Google directly.
                    </Text>
                </Section>
                <Section style={timelineRow}>
                    <Text style={dot}>③</Text>
                    <Text style={timelineText}>
                        <b>We send your welcome email</b> — with the onboarding
                        guide attached and everything you need to get started.
                    </Text>
                </Section>
            </Section>

            {/* Role-specific note */}
            <Section style={isCreative ? creativeBox : clientBox}>
                <Text style={roleTitle}>
                    {isCreative
                        ? "🎨 You signed up as a Creative"
                        : "🛒 You signed up as a Client"}
                </Text>
                <Text style={roleText}>
                    {isCreative
                        ? "As a creative, you'll be testing the service listing, booking management, Stripe Connect payouts, and portfolio features. You can also switch to the client role inside the app at any time."
                        : "As a client, you'll be testing the booking flow, payments, map discovery, and review features. You can also switch to the creative role inside the app if you want to test that side too."}
                </Text>
            </Section>

            {/* What to expect */}
            <Text style={sectionTitle}>While you wait</Text>
            <Text style={para}>
                Think about which creative service you&apos;d like to book first
                (if you&apos;re a client), or what services you&apos;d like to
                list (if you&apos;re a creative). The more realistic your
                testing is, the more helpful your feedback will be.
            </Text>

            <Hr style={divider} />

            <Text style={closing}>
                We&apos;re excited to have you on board. Thank you for helping
                us build something great. 🌟
            </Text>
            <Text style={sig}>— The Wondar Team</Text>
        </EmailLayout>
    );
};

// Styles
const hero = { textAlign: "center" as const, padding: "24px 0 28px" };
const emoji = { fontSize: "44px", margin: "0 0 12px" };
const heading = {
    color: "#1A2E1A",
    fontSize: "26px",
    fontWeight: "700",
    margin: "0 0 8px",
};
const sub = { color: "#6b7280", fontSize: "15px", margin: "0" };
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
    margin: "0 0 16px",
};
const timelineRow = { marginBottom: "12px" };
const dot = {
    display: "inline",
    color: "#2D5A3D",
    fontWeight: "700",
    fontSize: "16px",
    margin: "0 8px 0 0",
};
const timelineText = {
    display: "inline",
    color: "#374151",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
};
const creativeBox = {
    backgroundColor: "#fef9ee",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "16px 0",
    borderLeft: "4px solid #f59e0b",
};
const clientBox = {
    backgroundColor: "#eff6ff",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "16px 0",
    borderLeft: "4px solid #3b82f6",
};
const roleTitle = {
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 8px",
};
const roleText = {
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
};
const sectionTitle = {
    color: "#1A2E1A",
    fontSize: "16px",
    fontWeight: "700",
    margin: "20px 0 8px",
};
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

export default TesterConfirmationEmail;
