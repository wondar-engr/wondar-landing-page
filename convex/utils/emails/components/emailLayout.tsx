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
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
    preview: string;
    children: React.ReactNode;
}

const LOGO_URL = process.env.LOGO_URL || "https://wondarapp.com/logo.png";
const WEBSITE_URL = "https://wondarapp.com";

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
                            width="140"
                            height="40"
                            alt="Wondar"
                            style={logo}
                        />
                    </Section>

                    {/* Content */}
                    <Section style={content}>{children}</Section>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
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
