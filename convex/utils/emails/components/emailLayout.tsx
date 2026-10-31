import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
    Font,
    Row,
    Column,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
    preview: string;
    children: React.ReactNode;
}

const LOGO_URL =
    process.env.LOGO_URL || "https://wondarapp.com/images/logo-wide.png";
const WEBSITE_URL = "https://wondarapp.com";
const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew";

interface StoreBadgeProps {
    href: string;
    imageUrl?: string; // real badge artwork, falls back to a styled button
    alt: string;
    small: string;
    big: string;
}

// Inboxes block SVG and strip most styling, so the default badge is a plain
// styled link. Set APP_STORE_BADGE_URL / PLAY_STORE_BADGE_URL to a hosted PNG
// to use the official artwork instead.
const StoreBadge = ({ href, imageUrl, alt, small, big }: StoreBadgeProps) => (
    <Link href={href} style={badgeLink}>
        {imageUrl ? (
            <Img src={imageUrl} alt={alt} height="40" style={badgeImage} />
        ) : (
            <span style={badgeButton}>
                <span style={badgeSmall}>{small}</span>
                <span style={badgeBig}>{big}</span>
            </span>
        )}
    </Link>
);

const StoreBadges = () => {
    // Read at render time so the link follows the deployment's environment
    const appStoreUrl = process.env.APP_STORE_URL;

    return (
        <Section style={badges}>
            <Text style={badgesLabel}>Get the Wondar app</Text>
            <Row style={badgesRow}>
                {appStoreUrl && (
                    <Column style={badgeCell}>
                        <StoreBadge
                            href={appStoreUrl}
                            imageUrl={process.env.APP_STORE_BADGE_URL}
                            alt="Download on the App Store"
                            small="Download on the"
                            big="App Store"
                        />
                    </Column>
                )}
                <Column style={badgeCell}>
                    <StoreBadge
                        href={PLAY_STORE_URL}
                        imageUrl={process.env.PLAY_STORE_BADGE_URL}
                        alt="Get it on Google Play"
                        small="GET IT ON"
                        big="Google Play"
                    />
                </Column>
            </Row>
        </Section>
    );
};

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Inter"
                    fallbackFontFamily="Arial"
                    webFont={{
                        url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
                        format: "woff2",
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Img
                            src={LOGO_URL}
                            width="160"
                            height="31"
                            alt="Wondar"
                            style={logo}
                        />
                    </Section>

                    {/* Content */}
                    <Section style={content}>{children}</Section>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
                        <StoreBadges />
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Wondar. All rights
                            reserved.
                        </Text>
                        <Text style={footerLinks}>
                            <Link href={WEBSITE_URL} style={link}>
                                Website
                            </Link>
                            {" • "}
                            <Link href={`${WEBSITE_URL}/privacy`} style={link}>
                                Privacy Policy
                            </Link>
                            {" • "}
                            <Link href={`${WEBSITE_URL}/terms`} style={link}>
                                Terms of Service
                            </Link>
                        </Text>
                        <Text style={footerAddress}>
                            Wondar Inc. • Connecting Creatives Everywhere
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: "Inter, Arial, sans-serif",
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "0",
    maxWidth: "600px",
    borderRadius: "8px",
    overflow: "hidden" as const,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
};

const header = {
    backgroundColor: "#ffffff",
    padding: "32px 40px 24px",
    textAlign: "center" as const,
};

const logo = {
    margin: "0 auto",
    objectFit: "contain" as const,
};

const content = {
    padding: "0 40px 32px",
};

const hr = {
    borderColor: "#e8f5e9",
    margin: "0",
};

const footer = {
    padding: "24px 40px",
    backgroundColor: "#f8fdf8",
};

const badges = {
    margin: "0 0 20px",
    textAlign: "center" as const,
};

const badgesLabel = {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "16px",
    textAlign: "center" as const,
    margin: "0 0 10px",
};

const badgesRow = { width: "auto", margin: "0 auto" };

const badgeCell = { padding: "0 6px" };

const badgeLink = { textDecoration: "none" };

const badgeImage = { display: "block", height: "40px", width: "auto" };

const badgeButton = {
    display: "inline-block",
    backgroundColor: "#000000",
    border: "1px solid #a6a6a6",
    borderRadius: "8px",
    padding: "6px 16px",
    textAlign: "left" as const,
    minWidth: "104px",
};

const badgeSmall = {
    display: "block",
    color: "#ffffff",
    fontSize: "9px",
    lineHeight: "11px",
    letterSpacing: "0.3px",
};

const badgeBig = {
    display: "block",
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "600" as const,
    lineHeight: "21px",
};

const footerText = {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "16px",
    textAlign: "center" as const,
    margin: "0 0 8px",
};

const footerLinks = {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "16px",
    textAlign: "center" as const,
    margin: "0 0 8px",
};

const link = {
    color: "#2B9311",
    textDecoration: "none",
};

const footerAddress = {
    color: "#9ca3af",
    fontSize: "11px",
    lineHeight: "14px",
    textAlign: "center" as const,
    margin: "0",
};

export default EmailLayout;
