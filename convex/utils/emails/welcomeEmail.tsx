import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/emailLayout";

interface WelcomeEmailProps {
    firstName: string;
    selectedRole: "CLIENT" | "CREATIVE";
}

const WEBSITE_URL = "https://wondarapp.com";
export const WelcomeEmail = ({
    firstName,
    selectedRole,
}: WelcomeEmailProps) => {
    const isCreative = selectedRole === "CREATIVE";

    return (
        <EmailLayout preview={`Welcome to Wondar, ${firstName}! 🎉`}>
            {/* Personal Message from Dee */}
            <Section style={messageSection}>
                <Text style={fromText}>A message from Dee, CEO of Wondar</Text>
            </Section>

            <Heading style={heading}>
                Welcome to Wondar, {firstName}! 🎉
            </Heading>

            <Text style={paragraph}>Hey {firstName},</Text>

            <Text style={paragraph}>
                I&apos;m Dee (Devon Brownlee), the founder and CEO of Wondar. I
                wanted to personally welcome you to our community and thank you
                for joining us on this exciting journey.
            </Text>

            <Text style={paragraph}>
                At Wondar, we believe in the power of creativity and connection.
                We built this platform to make it easier for talented creatives
                to showcase their skills and for clients to discover amazing
                services right in their neighborhood.
            </Text>

            {isCreative ? (
                <>
                    <Section style={highlightBox}>
                        <Text style={highlightTitle}>
                            🎨 You&apos;re starting as a Creative
                        </Text>
                        <Text style={highlightText}>
                            That&apos;s awesome! You&apos;re about to join a
                            community of talented individuals who are turning
                            their passion into thriving businesses.
                        </Text>
                    </Section>

                    <Text style={paragraph}>
                        <strong>Here&apos;s what you can do next:</strong>
                    </Text>

                    <Text style={listItem}>
                        ✨ <strong>Set up your services</strong> — Create
                        listings that showcase what you offer
                    </Text>
                    <Text style={listItem}>
                        📸 <strong>Build your portfolio</strong> — Upload photos
                        of your best work
                    </Text>
                    <Text style={listItem}>
                        📍 <strong>Get discovered</strong> — Clients nearby will
                        be able to find and book you
                    </Text>
                </>
            ) : (
                <>
                    <Section style={highlightBox}>
                        <Text style={highlightTitle}>
                            🔍 You&apos;re starting as a Client
                        </Text>
                        <Text style={highlightText}>
                            Perfect! You now have access to a world of talented
                            creatives ready to bring your vision to life.
                        </Text>
                    </Section>

                    <Text style={paragraph}>
                        <strong>Here&apos;s what you can do next:</strong>
                    </Text>

                    <Text style={listItem}>
                        🔍 <strong>Explore creatives</strong> — Browse talented
                        professionals in your area
                    </Text>
                    <Text style={listItem}>
                        📅 <strong>Book services</strong> — Find the perfect
                        creative and book instantly
                    </Text>
                    <Text style={listItem}>
                        ⭐ <strong>Leave reviews</strong> — Help others discover
                        great creatives
                    </Text>
                </>
            )}

            <Text style={paragraph}>
                And here&apos;s a little secret — you can always switch between
                being a Client and a Creative anytime from your settings. So
                whether you want to book a service or offer your own, Wondar has
                you covered.
            </Text>

            <Section style={buttonSection}>
                <Button style={button} href={WEBSITE_URL}>
                    Open Wondar
                </Button>
            </Section>

            <Text style={paragraph}>
                If you ever have questions, feedback, or just want to say hi,
                feel free to reach out. We&apos;re building this together, and
                your voice matters.
            </Text>

            <Text style={signature}>Cheers,</Text>
            <Text style={signatureName}>Dee (Devon Brownlee)</Text>
            <Text style={signatureTitle}>Founder & CEO, Wondar</Text>
        </EmailLayout>
    );
};

// Styles
const messageSection = {
    textAlign: "center" as const,
    marginBottom: "24px",
};

const fromText = {
    color: "#6b7280",
    fontSize: "13px",
    fontStyle: "italic" as const,
    margin: "0",
};

const heading = {
    color: "#1A2E1A",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "36px",
    margin: "0 0 24px",
    textAlign: "center" as const,
};

const paragraph = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};

const highlightBox = {
    backgroundColor: "#E8F5E9",
    borderRadius: "12px",
    padding: "20px 24px",
    margin: "24px 0",
    borderLeft: "4px solid #5BD300",
};

const highlightTitle = {
    color: "#2B9311",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 8px",
};

const highlightText = {
    color: "#1A2E1A",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
};

const listItem = {
    color: "#1A2E1A",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0 0 12px",
    paddingLeft: "8px",
};

const buttonSection = {
    textAlign: "center" as const,
    margin: "32px 0",
};

const button = {
    backgroundColor: "#5BD300",
    borderRadius: "12px",
    color: "#1A2E1A",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    padding: "14px 32px",
    display: "inline-block",
};

const signature = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "24px 0 4px",
};

const signatureName = {
    color: "#1A2E1A",
    fontSize: "15px",
    fontWeight: "600",
    lineHeight: "20px",
    margin: "0",
};

const signatureTitle = {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "18px",
    margin: "4px 0 0",
};

export default WelcomeEmail;
