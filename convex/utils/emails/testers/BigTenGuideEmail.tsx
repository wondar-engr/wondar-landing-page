import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface BigTenGuideEmailProps {
    firstName?: string;
}

const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew";

type Step = {
    title: string;
    desc?: string;
    creative?: string; // shown under a CREATIVES label
    client?: string; // shown under a CLIENTS label
};

const SETUP_STEPS: Step[] = [
    {
        title: "Set up your Creative or Client account",
        desc: "Create your account and sign in with your email. We will send you a one-time code, so there's no password to remember.",
    },
    {
        title: "Allow permissions",
        desc: "Location, notifications and access to your photo gallery.",
    },
    {
        title: "Become a Creative or a Client",
        creative:
            "Tap Become a Creative, then add your business name, category, location and logo.",
        client: "Tap Become a Client to book a Creative, set up your account and fill out your profile information.",
    },
    {
        title: "Creatives, connect a Stripe account",
        desc: "This is how you get your booking fees and final payments paid successfully. Make sure you do this before you proceed with your Bio and Service information, so you do not miss out on any bookings and payments.",
    },
    {
        title: "Publish a service. Book a service.",
        creative:
            "Publish at least one service with your price, booking fee and availability.",
        client: "Book at least one service with a service provider, make a booking fee payment, and pay the final balance before the service starts.",
    },
    {
        title: "Show your work. Leave a review.",
        creative: "Upload portfolio posts: photos or videos of your work.",
        client: "Please leave a review about the service provider and the service experience you received.",
    },
];

const CREATIVE_BOOKING_FLOW: Step[] = [
    {
        title: "Accept the request",
        desc: "When a client books you, accept it from the booking screen.",
    },
    {
        title: "The client payment",
        desc: "The client pays a booking fee first, then the remaining balance at any time before the service commences.",
    },
    {
        title: "Start on time",
        desc: "Start Service unlocks once the client has paid in full. You can start 1 hour before your booked time.",
    },
    {
        title: "Finish service, then load up photos/videos of the completed service",
        desc: "Add at least one completion photo, then mark the service complete. The photos protect you if an issue comes up later.",
    },
    {
        title: "Get paid",
        desc: "Your money reaches your Stripe account balance as the client pays. Withdraw from the Earnings screen. (Instant payouts carry a small fee.)",
    },
];

const CLIENT_BOOKING_FLOW: Step[] = [
    {
        title: "Find a creative",
        desc: "Browse or search for the service you need and open the creative's profile to see their work, services and reviews.",
    },
    {
        title: "Send your booking request",
        desc: "Pick a service and your preferred date and time. You can also ask for a custom quote and share your budget.",
    },
    {
        title: "Wait for the creative to accept",
        desc: "You'll be notified as soon as they respond.",
    },
    {
        title: "Pay the booking fee",
        desc: "Once your request is accepted, pay the booking fee to secure your slot.",
    },
    {
        title: "Pay the remaining balance",
        desc: "Pay the balance at any time before the service starts. The creative can only start once you have paid in full.",
    },
    {
        title: "Enjoy the service, then leave a review",
        desc: "Tell us about the service provider and the experience you received. It helps the whole community.",
    },
];

const StoreButtons = () => {
    // Read at render time so a newly set env var is picked up without a code change
    const APP_STORE_URL = process.env.APP_STORE_URL;
    return (
        <Section style={card}>
            <Text style={cardTitle}>📲 Download Wondar</Text>
            <Text style={cardText}>
                Install the app from the store on your phone, then follow the
                steps below.
            </Text>
            {APP_STORE_URL && (
                <Button style={btnPrimary} href={APP_STORE_URL}>
                    Download on the App Store →
                </Button>
            )}
            <Button style={btnSecondary} href={PLAY_STORE_URL}>
                Get it on Google Play →
            </Button>
        </Section>
    );
};

const NumberedSteps = ({ steps }: { steps: Step[] }) => (
    <Section style={{ margin: "4px 0 20px" }}>
        {steps.map((s, i) => (
            <Section key={s.title} style={stepRow}>
                <Text style={stepTitle}>
                    <span style={stepNum}>0{i + 1}</span> {s.title}
                </Text>
                {s.desc && <Text style={stepDesc}>{s.desc}</Text>}
                {s.creative && (
                    <Text style={stepDesc}>
                        <span style={audience}>CREATIVES:</span> {s.creative}
                    </Text>
                )}
                {s.client && (
                    <Text style={stepDesc}>
                        <span style={audience}>CLIENTS:</span> {s.client}
                    </Text>
                )}
            </Section>
        ))}
    </Section>
);

export const BigTenGuideEmail = ({ firstName }: BigTenGuideEmailProps) => (
    <EmailLayout
        preview={`${firstName || "Your"} Wondar Big Ten starter guide is here`}
    >
        <Section style={hero}>
            <Text style={heroLabel}>Wondar · Big Ten</Text>
            <Heading style={heroTitle}>Your starter guide</Heading>
            <Text style={heroSub}>
                Everything you need to do, and the order to do it in:
            </Text>
        </Section>

        <Text style={paragraph}>Hi {firstName || "there"},</Text>
        <Text style={paragraph}>
            Here&apos;s everything you need to get going. The full guide is
            attached to this email as a PDF, so save it and keep it handy.
        </Text>

        <StoreButtons />

        <Heading as="h2" style={sectionTitle}>
            Let&apos;s get started
        </Heading>
        <NumberedSteps steps={SETUP_STEPS} />

        <Heading as="h2" style={sectionTitle}>
            How a booking works for Creatives
        </Heading>
        <NumberedSteps steps={CREATIVE_BOOKING_FLOW} />

        <Heading as="h2" style={sectionTitle}>
            How making a booking works for Clients
        </Heading>
        <NumberedSteps steps={CLIENT_BOOKING_FLOW} />
        <Text style={note}>
            If anything goes wrong with a service, either side can open a
            dispute. The Wondar team reviews the report and all evidence
            submitted, then decides the outcome.
        </Text>

        <Section style={attachCard}>
            <Text style={attachTitle}>📎 Your guide is attached</Text>
            <Text style={attachText}>
                The PDF walks through the whole flow with screenshots and a
                checklist of what to test. Open it alongside the app.
            </Text>
        </Section>

        <Heading as="h2" style={sectionTitle}>
            Found a bug or an issue? Tell us in the app
        </Heading>
        <Text style={paragraph}>
            Go to Settings → Report a Bug and add a screenshot of the issue if
            you can. Your report reaches us instantly.
        </Text>

        <Text style={paragraph}>
            You&apos;ll also get a short daily check-in notification. Take a
            minute to check in with us, it helps us a lot.
        </Text>

        <Hr style={divider} />
        <Text style={paragraph}>
            Now get ready to: Create, Connect, and Build a Community where you
            are found as a Creative, and also find the services you seek as a
            Client.
        </Text>
        <Text style={paragraph}>
            Thank you for working with us, as we aim to build this amazing
            platform and community.
        </Text>
        <Text style={signature}>— The Wondar Team</Text>
    </EmailLayout>
);

const hero = {
    backgroundColor: "#2D5A3D",
    borderRadius: "16px",
    padding: "32px 28px",
    margin: "0 0 28px",
};
const heroLabel = {
    color: "#a7f3d0",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 10px",
};
const heroTitle = {
    color: "#E4F97C",
    fontSize: "34px",
    fontWeight: "700",
    lineHeight: "40px",
    margin: "0 0 8px",
};
const heroSub = { color: "#d1fae5", fontSize: "15px", margin: "0" };
const paragraph = {
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
    fontSize: "15px",
    fontWeight: "700",
    margin: "0 0 6px",
};
const cardText = {
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 14px",
};
const btnPrimary = {
    backgroundColor: "#2D5A3D",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 22px",
    textDecoration: "none",
    display: "inline-block" as const,
    margin: "0 8px 8px 0",
};
const btnSecondary = {
    backgroundColor: "#E4F97C",
    borderRadius: "10px",
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 22px",
    textDecoration: "none",
    display: "inline-block" as const,
    margin: "0 0 8px",
};
const sectionTitle = {
    color: "#1A2E1A",
    fontSize: "19px",
    fontWeight: "700",
    margin: "28px 0 10px",
};
const stepRow = {
    borderLeft: "3px solid #5BD300",
    padding: "2px 0 2px 14px",
    margin: "0 0 14px",
};
const stepNum = { color: "#5BD300", fontWeight: "700" };
const stepTitle = {
    color: "#1A2E1A",
    fontSize: "15px",
    fontWeight: "600",
    margin: "0 0 2px",
};
const stepDesc = {
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
};
const note = {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 8px",
};
const attachCard = {
    backgroundColor: "#fef9ee",
    borderLeft: "4px solid #f59e0b",
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "24px 0",
};
const attachTitle = {
    color: "#92400e",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 6px",
};
const attachText = {
    color: "#78350f",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
};
const audience = {
    color: "#2D5A3D",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1px",
};
const divider = { borderColor: "#e5e7eb", margin: "24px 0" };
const signature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};

export default BigTenGuideEmail;
