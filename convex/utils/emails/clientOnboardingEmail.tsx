import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/emailLayout";

interface ClientOnboardingCompleteEmailProps {
    firstName: string;
}

const WEBSITE_URL = "https://wondarapp.com";

export const ClientOnboardingCompleteEmail = ({
    firstName,
}: ClientOnboardingCompleteEmailProps) => {
    return (
        <EmailLayout
            preview={`You're all set to discover amazing creatives, ${firstName}!`}
        >
            <Section style={heroSection}>
                <Text style={emoji}>🎊</Text>
                <Heading style={heading}>
                    You&apos;re Ready to Discover!
                </Heading>
                <Text style={subheading}>Your client profile is complete</Text>
            </Section>

            <Text style={paragraph}>Hey {firstName},</Text>

            <Text style={paragraph}>
                Great news — your client profile is all set up! You now have
                full access to discover and book talented creatives in your
                area.
            </Text>

            <Section style={featuresGrid}>
                <Section style={featureCard}>
                    <Text style={featureEmoji}>🔍</Text>
                    <Text style={featureTitle}>Discover</Text>
                    <Text style={featureDesc}>
                        Browse creatives by category, location, or ratings
                    </Text>
                </Section>

                <Section style={featureCard}>
                    <Text style={featureEmoji}>📅</Text>
                    <Text style={featureTitle}>Book Instantly</Text>
                    <Text style={featureDesc}>
                        Schedule appointments that fit your timeline
                    </Text>
                </Section>

                <Section style={featureCard}>
                    <Text style={featureEmoji}>💬</Text>
                    <Text style={featureTitle}>Chat Directly</Text>
                    <Text style={featureDesc}>
                        Message creatives to discuss your needs
                    </Text>
                </Section>

                <Section style={featureCard}>
                    <Text style={featureEmoji}>⭐</Text>
                    <Text style={featureTitle}>Leave Reviews</Text>
                    <Text style={featureDesc}>
                        Share your experience to help others
                    </Text>
                </Section>
            </Section>

            <Section style={tipBox}>
                <Text style={tipTitle}>💡 Pro Tip</Text>
                <Text style={tipText}>
                    Enable location services to see creatives near you. The
                    closer they are, the easier it is to book and meet!
                </Text>
            </Section>

            <Section style={buttonSection}>
                <Button style={button} href={WEBSITE_URL}>
                    Start Exploring
                </Button>
            </Section>

            <Text style={paragraph}>
                Have a creative skill you&apos;d like to offer? You can switch
                to a Creative account anytime from your settings and start
                earning!
            </Text>

            <Text style={closingText}>Happy discovering! 🌟</Text>
            <Text style={teamSignature}>— The Wondar Team</Text>
        </EmailLayout>
    );
};

// Styles
const heroSection = {
    textAlign: "center" as const,
    padding: "24px 0 32px",
};

const emoji = {
    fontSize: "48px",
    margin: "0 0 16px",
};

const heading = {
    color: "#1A2E1A",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "36px",
    margin: "0 0 8px",
};

const subheading = {
    color: "#6b7280",
    fontSize: "16px",
    margin: "0",
};

const paragraph = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};

const featuresGrid = {
    margin: "32px 0",
};

const featureCard = {
    backgroundColor: "#f8fdf8",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "12px",
};

const featureEmoji = {
    fontSize: "24px",
    margin: "0 0 8px",
};

const featureTitle = {
    color: "#1A2E1A",
    fontSize: "15px",
    fontWeight: "600",
    margin: "0 0 4px",
};

const featureDesc = {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "18px",
    margin: "0",
};

const tipBox = {
    backgroundColor: "#FEF3C7",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "24px 0",
};

const tipTitle = {
    color: "#92400E",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 8px",
};

const tipText = {
    color: "#78350F",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
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

const closingText = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "24px 0 4px",
};

const teamSignature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};

export default ClientOnboardingCompleteEmail;
