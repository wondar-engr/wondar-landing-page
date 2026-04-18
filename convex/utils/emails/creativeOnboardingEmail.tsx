import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface CreativeOnboardingCompleteEmailProps {
    firstName: string;
    businessName: string;
    skills: string[];
}
const LOGO_URL = process.env.LOGO_URL || "https://wondarapp.com/logo.png";

export const CreativeOnboardingCompleteEmail = ({
    firstName,
    businessName,
    skills,
}: CreativeOnboardingCompleteEmailProps) => {
    const previewText = `Welcome to Wondar! Your creative profile is live.`;
    const skillsDisplay = skills.join(" • ");

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo */}
                    <Section style={logoSection}>
                        <Img
                            src={LOGO_URL}
                            width="150"
                            height="40"
                            alt="Wondar"
                            style={logo}
                        />
                    </Section>

                    {/* Hero */}
                    <Section style={heroSection}>
                        <Text style={celebrationEmoji}>🎉</Text>
                        <Heading style={heading}>
                            Welcome to Wondar, {firstName}!
                        </Heading>
                        <Text style={subheading}>
                            Your creative profile is now live and ready for
                            clients to discover.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Profile Summary */}
                    <Section style={summarySection}>
                        <Text style={sectionTitle}>Your Profile</Text>
                        <Container style={profileCard}>
                            <Text style={businessNameText}>{businessName}</Text>
                            <Text style={skillText}>{skillsDisplay}</Text>
                        </Container>
                    </Section>

                    {/* Next Steps */}
                    <Section style={stepsSection}>
                        <Text style={sectionTitle}>🎯 Your Next Steps</Text>

                        <Container style={stepCard}>
                            <Text style={stepNumber}>1</Text>
                            <Container style={stepContent}>
                                <Text style={stepTitle}>
                                    Create Your First Service
                                </Text>
                                <Text style={stepDescription}>
                                    Add services with pricing so clients can
                                    book you. Be specific about what you offer
                                    and how long it takes.
                                </Text>
                            </Container>
                        </Container>

                        <Container style={stepCard}>
                            <Text style={stepNumber}>2</Text>
                            <Container style={stepContent}>
                                <Text style={stepTitle}>
                                    Set Your Availability
                                </Text>
                                <Text style={stepDescription}>
                                    Let clients know when you&apos;re available.
                                    The more availability you offer, the more
                                    bookings you&apos;ll receive.
                                </Text>
                            </Container>
                        </Container>

                        <Container style={stepCard}>
                            <Text style={stepNumber}>3</Text>
                            <Container style={stepContent}>
                                <Text style={stepTitle}>
                                    Connect Your Payments
                                </Text>
                                <Text style={stepDescription}>
                                    Set up Stripe to receive payments directly
                                    to your bank account. Fast, secure, and
                                    hassle-free.
                                </Text>
                            </Container>
                        </Container>

                        <Container style={stepCard}>
                            <Text style={stepNumber}>4</Text>
                            <Container style={stepContent}>
                                <Text style={stepTitle}>
                                    Build Your Portfolio
                                </Text>
                                <Text style={stepDescription}>
                                    Upload photos and videos of your best work.
                                    Clients are 5x more likely to book creatives
                                    with complete portfolios.
                                </Text>
                            </Container>
                        </Container>
                    </Section>

                    {/* CTA Button */}
                    <Section style={ctaSection}>
                        <Button
                            style={ctaButton}
                            href="https://wondarapp.com/creative/dashboard"
                        >
                            Go to Your Dashboard
                        </Button>
                    </Section>

                    <Hr style={hr} />

                    {/* Pro Tips */}
                    <Section style={tipsSection}>
                        <Text style={sectionTitle}>
                            💡 Pro Tips for Success
                        </Text>
                        <Text style={tipText}>
                            <strong>Respond quickly:</strong> Creatives who
                            respond within 1 hour get 3x more bookings.
                        </Text>
                        <Text style={tipText}>
                            <strong>Keep your calendar updated:</strong> Nothing
                            frustrates clients more than outdated availability.
                        </Text>
                        <Text style={tipText}>
                            <strong>Ask for reviews:</strong> After each
                            booking, encourage happy clients to leave a review.
                            Social proof is everything.
                        </Text>
                        <Text style={tipText}>
                            <strong>Post regularly:</strong> Creatives who post
                            new work weekly get 2x more profile views.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Support */}
                    <Section style={supportSection}>
                        <Text style={supportTitle}>Need Help?</Text>
                        <Text style={supportText}>
                            Our support team is here for you. Reply to this
                            email or visit our{" "}
                            <Link
                                href="https://wondarapp.com/help"
                                style={link}
                            >
                                Help Center
                            </Link>{" "}
                            for guides and FAQs.
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Wondar. All rights
                            reserved.
                        </Text>
                        <Text style={footerLinks}>
                            <Link
                                href="https://wondarapp.com/privacy"
                                style={footerLink}
                            >
                                Privacy Policy
                            </Link>
                            {" • "}
                            <Link
                                href="https://wondarapp.com/terms"
                                style={footerLink}
                            >
                                Terms of Service
                            </Link>
                            {" • "}
                            <Link
                                href="https://wondarapp.com/unsubscribe"
                                style={footerLink}
                            >
                                Unsubscribe
                            </Link>
                        </Text>
                        <Text style={footerAddress}>
                            Wondar Inc. • Atlanta, GA
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default CreativeOnboardingCompleteEmail;

// ==================== STYLES ====================

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "0",
    maxWidth: "600px",
    borderRadius: "8px",
    overflow: "hidden",
};

const logoSection = {
    backgroundColor: "#1a2e1a",
    padding: "24px",
    textAlign: "center" as const,
};

const logo = {
    margin: "0 auto",
};

const heroSection = {
    padding: "40px 32px",
    textAlign: "center" as const,
    backgroundColor: "#f0fdf0",
};

const celebrationEmoji = {
    fontSize: "48px",
    margin: "0 0 16px 0",
};

const heading = {
    color: "#1a2e1a",
    fontSize: "28px",
    fontWeight: "700",
    margin: "0 0 12px 0",
    lineHeight: "1.3",
};

const subheading = {
    color: "#4a5568",
    fontSize: "16px",
    margin: "0",
    lineHeight: "1.5",
};

const hr = {
    borderColor: "#e2e8f0",
    margin: "0",
};

const summarySection = {
    padding: "32px",
};

const sectionTitle = {
    color: "#1a2e1a",
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 16px 0",
};

const profileCard = {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e2e8f0",
};

const businessNameText = {
    color: "#1a2e1a",
    fontSize: "20px",
    fontWeight: "700",
    margin: "0 0 4px 0",
};

const skillText = {
    color: "#5bd300",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
};

const stepsSection = {
    padding: "32px",
    backgroundColor: "#fafafa",
};

const stepCard = {
    display: "flex",
    marginBottom: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #e2e8f0",
};

const stepNumber = {
    backgroundColor: "#5bd300",
    color: "#1a2e1a",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    textAlign: "center" as const,
    lineHeight: "28px",
    fontWeight: "700",
    fontSize: "14px",
    marginRight: "16px",
    flexShrink: 0,
};

const stepContent = {
    flex: 1,
};

const stepTitle = {
    color: "#1a2e1a",
    fontSize: "15px",
    fontWeight: "600",
    margin: "0 0 4px 0",
};

const stepDescription = {
    color: "#64748b",
    fontSize: "13px",
    margin: "0",
    lineHeight: "1.5",
};

const ctaSection = {
    padding: "32px",
    textAlign: "center" as const,
};

const ctaButton = {
    backgroundColor: "#1a2e1a",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center" as const,
    padding: "14px 32px",
    display: "inline-block",
};

const tipsSection = {
    padding: "32px",
};

const tipText = {
    color: "#4a5568",
    fontSize: "14px",
    margin: "0 0 12px 0",
    lineHeight: "1.6",
    paddingLeft: "8px",
    borderLeft: "3px solid #5bd300",
};

const supportSection = {
    padding: "32px",
    backgroundColor: "#f8fafc",
    textAlign: "center" as const,
};

const supportTitle = {
    color: "#1a2e1a",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 8px 0",
};

const supportText = {
    color: "#64748b",
    fontSize: "14px",
    margin: "0",
    lineHeight: "1.5",
};

const link = {
    color: "#5bd300",
    textDecoration: "underline",
};

const footer = {
    padding: "24px 32px",
    textAlign: "center" as const,
};

const footerText = {
    color: "#94a3b8",
    fontSize: "12px",
    margin: "0 0 8px 0",
};

const footerLinks = {
    color: "#94a3b8",
    fontSize: "12px",
    margin: "0 0 8px 0",
};

const footerLink = {
    color: "#94a3b8",
    textDecoration: "underline",
};

const footerAddress = {
    color: "#cbd5e1",
    fontSize: "11px",
    margin: "0",
};
