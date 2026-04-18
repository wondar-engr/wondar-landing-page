import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/emailLayout";

interface WaitlistConfirmationEmailProps {
    firstName?: string;
    position: number;
    referralCode: string;
    referralLink: string;
}

const WEBSITE_URL = process.env.WEBSITE_URL || "https://wondarapp.com";

export const WaitlistConfirmationEmail = ({
    firstName,
    position,
    referralCode,
    referralLink,
}: WaitlistConfirmationEmailProps) => {
    const displayName = firstName || "there";

    return (
        <EmailLayout preview={`You're #${position} on the Wondar waitlist! 🎉`}>
            <Section style={heroSection}>
                <Text style={emoji}>🎉</Text>
                <Heading style={heading}>You&apos;re on the List!</Heading>
                <Text style={subheading}>
                    Welcome to the future of creative services
                </Text>
            </Section>

            <Text style={paragraph}>Hey {displayName},</Text>

            <Text style={paragraph}>
                Thanks for joining the Wondar waitlist! We&apos;re building
                something special — a marketplace that connects clients with
                talented creatives for hair, makeup, photography, and more.
            </Text>

            <Section style={positionCard}>
                <Text style={positionLabel}>Your position in line</Text>
                <Text style={positionNumber}>#{position}</Text>
                <Text style={positionSubtext}>
                    We&apos;ll notify you when it&apos;s your turn!
                </Text>
            </Section>

            <Section style={referralSection}>
                <Text style={referralTitle}>🚀 Skip the Line!</Text>
                <Text style={referralText}>
                    Share your unique link and move up 5 spots for every friend
                    who joins. The more you share, the sooner you get access!
                </Text>

                <Section style={codeBox}>
                    <Text style={codeLabel}>Your referral code</Text>
                    <Text style={codeValue}>{referralCode}</Text>
                </Section>

                <Button style={shareButton} href={referralLink}>
                    Share Your Link
                </Button>
            </Section>

            <Section style={featuresSection}>
                <Text style={featuresTitle}>What&apos;s Coming</Text>

                <Section style={featureRow}>
                    <Text style={featureEmoji}>🔍</Text>
                    <Section style={featureContent}>
                        <Text style={featureTitle}>
                            Discover Nearby Creatives
                        </Text>
                        <Text style={featureDesc}>
                            Find talented professionals in your area instantly
                        </Text>
                    </Section>
                </Section>

                <Section style={featureRow}>
                    <Text style={featureEmoji}>📅</Text>
                    <Section style={featureContent}>
                        <Text style={featureTitle}>Book Instantly</Text>
                        <Text style={featureDesc}>
                            Schedule appointments that fit your timeline
                        </Text>
                    </Section>
                </Section>

                <Section style={featureRow}>
                    <Text style={featureEmoji}>💳</Text>
                    <Section style={featureContent}>
                        <Text style={featureTitle}>Secure Payments</Text>
                        <Text style={featureDesc}>
                            Pay safely through the app with buyer protection
                        </Text>
                    </Section>
                </Section>

                <Section style={featureRow}>
                    <Text style={featureEmoji}>⭐</Text>
                    <Section style={featureContent}>
                        <Text style={featureTitle}>Real Reviews</Text>
                        <Text style={featureDesc}>
                            Make informed decisions with verified feedback
                        </Text>
                    </Section>
                </Section>
            </Section>

            <Section style={tipBox}>
                <Text style={tipTitle}>💡 Are you a creative?</Text>
                <Text style={tipText}>
                    Hairstylist, makeup artist, photographer, or other creative
                    professional? Wondar helps you grow your business, manage
                    bookings, and get paid fast. Reply to this email to get
                    early creative access!
                </Text>
            </Section>

            <Section style={buttonSection}>
                <Button style={button} href={WEBSITE_URL}>
                    Visit Wondar
                </Button>
            </Section>

            <Text style={closingText}>
                We can&apos;t wait to have you on board! 🌟
            </Text>
            <Text style={teamSignature}>— The Wondar Team</Text>

            <Section style={footerSection}>
                <Text style={footerText}>
                    You&apos;re receiving this because you signed up for the
                    Wondar waitlist. Don&apos;t want these emails?{" "}
                    <a href={`${WEBSITE_URL}/unsubscribe`} style={footerLink}>
                        Unsubscribe
                    </a>
                </Text>
            </Section>
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

const positionCard = {
    backgroundColor: "#2D5A3D",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center" as const,
    margin: "24px 0",
};

const positionLabel = {
    color: "#a7f3d0",
    fontSize: "14px",
    fontWeight: "500",
    margin: "0 0 8px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
};

const positionNumber = {
    color: "#E4F97C",
    fontSize: "48px",
    fontWeight: "700",
    margin: "0 0 8px",
    lineHeight: "1",
};

const positionSubtext = {
    color: "#d1fae5",
    fontSize: "14px",
    margin: "0",
};

const referralSection = {
    backgroundColor: "#f8fdf8",
    borderRadius: "16px",
    padding: "24px",
    margin: "24px 0",
    textAlign: "center" as const,
};

const referralTitle = {
    color: "#1A2E1A",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 12px",
};

const referralText = {
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 20px",
};

const codeBox = {
    backgroundColor: "#ffffff",
    border: "2px dashed #2D5A3D",
    borderRadius: "12px",
    padding: "16px",
    margin: "0 0 20px",
};

const codeLabel = {
    color: "#6b7280",
    fontSize: "12px",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
};

const codeValue = {
    color: "#2D5A3D",
    fontSize: "20px",
    fontWeight: "700",
    fontFamily: "monospace",
    margin: "0",
    letterSpacing: "1px",
};

const shareButton = {
    backgroundColor: "#E4F97C",
    borderRadius: "12px",
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    padding: "12px 24px",
    display: "inline-block",
};

const featuresSection = {
    margin: "32px 0",
};

const featuresTitle = {
    color: "#1A2E1A",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 20px",
};

const featureRow = {
    marginBottom: "16px",
};

const featureEmoji = {
    fontSize: "24px",
    display: "inline-block",
    verticalAlign: "top",
    width: "40px",
};

const featureContent = {
    display: "inline-block",
    verticalAlign: "top",
    width: "calc(100% - 50px)",
    paddingLeft: "8px",
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

const footerSection = {
    borderTop: "1px solid #e5e7eb",
    marginTop: "32px",
    paddingTop: "24px",
};

const footerText = {
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: "18px",
    textAlign: "center" as const,
};

const footerLink = {
    color: "#2D5A3D",
    textDecoration: "underline",
};

export default WaitlistConfirmationEmail;
