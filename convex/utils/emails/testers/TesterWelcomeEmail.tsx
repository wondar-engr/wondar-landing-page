import { Button, Heading, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface TesterWelcomeEmailProps {
    firstName: string;
    primaryRole: "CLIENT" | "CREATIVE";
    deviceOs: "IOS" | "ANDROID" | "BOTH";
}

const TESTFLIGHT_URL = "https://testflight.apple.com/join/YOUR_LINK";
const PLAYSTORE_URL =
    "https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew";

export const TesterWelcomeEmail = ({
    firstName,
    primaryRole,
    deviceOs,
}: TesterWelcomeEmailProps) => {
    const showIos = deviceOs === "IOS" || deviceOs === "BOTH";
    const showAndroid = deviceOs === "ANDROID" || deviceOs === "BOTH";

    return (
        <EmailLayout
            preview={`You're in, ${firstName}! Here's how to download Wondar and get started.`}
        >
            <Section style={hero}>
                <Text style={heroEmoji}>🎉</Text>
                <Heading style={heading}>You&apos;re officially in!</Heading>
                <Text style={sub}>Your Wondar beta access is ready.</Text>
            </Section>

            <Text style={para}>Hey {firstName},</Text>
            <Text style={para}>
                We&apos;ve added you to the Wondar beta program. You now have
                access to the app — follow the steps below to get it installed
                and start testing.
                <b>
                    {" "}
                    The onboarding guide is attached to this email as a PDF
                </b>{" "}
                — save it, it covers everything you need to know.
            </Text>

            {/* Install instructions */}
            <Section style={installCard}>
                <Text style={installTitle}>📲 Download the App</Text>

                {showIos && (
                    <Section style={platformRow}>
                        <Text style={platformLabel}>iOS — TestFlight</Text>
                        <Text style={platformDesc}>
                            Open TestFlight on your iPhone. You should see
                            Wondar listed under Available Apps. Tap Install.
                        </Text>
                        <Button style={btnPrimary} href={TESTFLIGHT_URL}>
                            Open TestFlight →
                        </Button>
                        <Text style={tip}>
                            If you don&apos;t have TestFlight, download it free
                            from the App Store first.
                        </Text>
                    </Section>
                )}

                {showIos && showAndroid && <Hr style={platformDivider} />}

                {showAndroid && (
                    <Section style={platformRow}>
                        <Text style={platformLabel}>Android — Play Store</Text>
                        <Text style={platformDesc}>
                            Open the Play Store and search for the package ID
                            below for easier access, or tap the button.
                        </Text>
                        <Text style={packageId}>com.wondarapp.wondarnew</Text>
                        <Button style={btnSecondary} href={PLAYSTORE_URL}>
                            Open Play Store →
                        </Button>
                    </Section>
                )}
            </Section>

            {/* Quick start */}
            <Text style={sectionTitle}>
                {primaryRole === "CREATIVE"
                    ? "🎨 Quick Start for Creatives"
                    : "🛒 Quick Start for Clients"}
            </Text>

            {primaryRole === "CLIENT" ? (
                <>
                    <Text style={stepLine}>
                        <b>1.</b> Create your account and set up your profile
                    </Text>
                    <Text style={stepLine}>
                        <b>2.</b> Allow location, notifications, and gallery
                        permissions
                    </Text>
                    <Text style={stepLine}>
                        <b>3.</b> Select your category preferences
                    </Text>
                    <Text style={stepLine}>
                        <b>4.</b> Open Explore and browse creatives near you
                    </Text>
                    <Text style={stepLine}>
                        <b>5.</b> Try making a booking — the full flow is in the
                        guide
                    </Text>
                </>
            ) : (
                <>
                    <Text style={stepLine}>
                        <b>1.</b> Create your account and tap &quot;Become a
                        Creative&quot;
                    </Text>
                    <Text style={stepLine}>
                        <b>2.</b> Set up your business name, category, location,
                        and logo
                    </Text>
                    <Text style={stepLine}>
                        <b>3.</b> Connect your bank account via Stripe
                    </Text>
                    <Text style={stepLine}>
                        <b>4.</b> Create at least one service with availability
                    </Text>
                    <Text style={stepLine}>
                        <b>5.</b> Upload some portfolio posts — images or videos
                        of your work
                    </Text>
                </>
            )}

            <Section style={guideBox}>
                <Text style={guideTitle}>
                    📎 Your Onboarding Guide is attached
                </Text>
                <Text style={guideText}>
                    The PDF attached to this email covers the full onboarding
                    process for both client and creative roles, the complete
                    booking flow, Stripe setup, and what to focus on when
                    testing. Keep it handy.
                </Text>
            </Section>

            {/* Bug reporting */}
            <Text style={sectionTitle}>🐛 Found a bug?</Text>
            <Text style={para}>
                Use the in-app bug report button (Settings → Report a Bug) or
                reply to this email directly. Always include your device model,
                OS version, and a screenshot or screen recording if you can — it
                helps us fix things faster.
            </Text>

            <Hr style={divider} />

            <Text style={closing}>
                Thank you for being part of this. Every piece of feedback you
                share helps us ship a better product. We&apos;re grateful to
                have you. 🙏
            </Text>
            <Text style={sig}>— The Wondar Team</Text>
        </EmailLayout>
    );
};

// Styles
const hero = { textAlign: "center" as const, padding: "24px 0 28px" };
const heroEmoji = { fontSize: "48px", margin: "0 0 12px" };
const heading = {
    color: "#1A2E1A",
    fontSize: "28px",
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
const installCard = {
    backgroundColor: "#f8fdf8",
    borderRadius: "16px",
    padding: "20px 24px",
    margin: "20px 0",
};
const installTitle = {
    color: "#2D5A3D",
    fontSize: "15px",
    fontWeight: "700",
    margin: "0 0 16px",
};
const platformRow = { marginBottom: "8px" };
const platformLabel = {
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 6px",
};
const platformDesc = {
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 12px",
};
const packageId = {
    fontFamily: "monospace",
    backgroundColor: "#ffffff",
    color: "#2D5A3D",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "8px",
    margin: "0 0 12px",
    display: "block" as const,
};
const btnPrimary = {
    backgroundColor: "#2D5A3D",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
    display: "inline-block" as const,
    margin: "0 0 8px",
};
const btnSecondary = {
    backgroundColor: "#E4F97C",
    borderRadius: "10px",
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
    display: "inline-block" as const,
    margin: "0 0 8px",
};
const tip = { color: "#9ca3af", fontSize: "12px", margin: "4px 0 0" };
const platformDivider = { borderColor: "#e5e7eb", margin: "16px 0" };
const sectionTitle = {
    color: "#1A2E1A",
    fontSize: "16px",
    fontWeight: "700",
    margin: "20px 0 10px",
};
const stepLine = {
    color: "#374151",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 8px",
};
const guideBox = {
    backgroundColor: "#fef9ee",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "20px 0",
    borderLeft: "4px solid #f59e0b",
};
const guideTitle = {
    color: "#92400e",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 8px",
};
const guideText = {
    color: "#78350f",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
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

export default TesterWelcomeEmail;
