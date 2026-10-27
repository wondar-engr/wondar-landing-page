import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

interface BigTenGuideEmailProps {
    firstName?: string;
}

const APP_STORE_URL = process.env.APP_STORE_URL; // button hidden until set
const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew";

type Step = { title: string; desc: string };

const SETUP_STEPS: Step[] = [
    {
        title: "Set up your account",
        desc: "Sign in with your email. We send you a one-time code, so there's no password to remember.",
    },
    {
        title: "Allow permissions",
        desc: "Location, notifications and your photo gallery.",
    },
    {
        title: "Become a Creative",
        desc: "Tap Become a Creative, then add your business name, category, location and logo.",
    },
    {
        title: "Connect a Stripe account first",
        desc: "This is how to get your booking and final payments paid successfully. (So make sure you do so before you proceed with Bio and Service information, that way you do not miss out on any bookings and payments).",
    },
    {
        title: "Publish a service",
        desc: "Add at least one service with your price, booking fee and availability.",
    },
    {
        title: "Show your work",
        desc: "Upload portfolio posts: photos or videos of your work.",
    },
];

const BOOKING_FLOW: Step[] = [
    {
        title: "Accept the request",
        desc: "When a client books you. Accept it from the booking screen.",
    },
    {
        title: "The client payment",
        desc: "They pay a booking fee first, then the remaining balance at any time before the service commences.",
    },
    {
        title: "Start on time",
        desc: "Start Service unlocks once the client has paid in full. You can start 1 hour before your booked time.",
    },
    {
        title: "Finish service, then upload photos",
        desc: "Add at least one completion photo, then mark the service complete. The photos protect you if an issue comes up.",
    },
    {
        title: "Get paid",
        desc: "Your money reaches your Stripe balance as the client pays. Withdraw from the Earnings screen (Instant payouts carry a small fee).",
    },
];

const StoreButtons = () => (
    <Section style={card}>
        <Text style={cardTitle}>📲 Download Wondar</Text>
        <Text style={cardText}>
            Install the app from the store on your phone, then follow the steps
            below.
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

const NumberedSteps = ({ steps }: { steps: Step[] }) => (
    <Section style={{ margin: "4px 0 20px" }}>
        {steps.map((s, i) => (
            <Section key={s.title} style={stepRow}>
                <Text style={stepTitle}>
                    <span style={stepNum}>0{i + 1}</span> {s.title}
                </Text>
                <Text style={stepDesc}>{s.desc}</Text>
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
                Everything you need to do, and its order is as follows:{" "}
            </Text>
        </Section>

        <Text style={paragraph}>Hi {firstName || "there"},</Text>
        <Text style={paragraph}>
            Here&apos;s everything you need to get going. The full guide is
            attached to this email as a PDF, so save it and keep it handy.
        </Text>

        <StoreButtons />

        <Heading as="h2" style={sectionTitle}>
            Set up your creative account
        </Heading>
        <NumberedSteps steps={SETUP_STEPS} />

        <Heading as="h2" style={sectionTitle}>
            How a booking works
        </Heading>
        <NumberedSteps steps={BOOKING_FLOW} />
        <Text style={note}>
            If anything goes wrong, either side can open a dispute and the
            Wondar team reviews report, and all evidence submitted, then decides
            the outcome.
        </Text>

        <Section style={attachCard}>
            <Text style={attachTitle}>📎 Your guide is attached</Text>
            <Text style={attachText}>
                The PDF walks through the whole flow with screenshots and a
                checklist of what to test. Open it alongside the app.
            </Text>
        </Section>

        <Heading as="h2" style={sectionTitle}>
            Found a bug? Tell us in the app
        </Heading>
        <Text style={paragraph}>
            Go to Settings → Report a Bug and add a screenshot if you can. It
            reaches us instantly with your device details attached.
        </Text>

        <Text style={paragraph}>
            You&apos;ll also get a short daily check-in. A minute of your time
            helps us a lot.
        </Text>

        <Hr style={divider} />
        <Text style={paragraph}>
            Thank you for helping us, as we aim to build this properly.
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
const divider = { borderColor: "#e5e7eb", margin: "24px 0" };
const signature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};

export default BigTenGuideEmail;
