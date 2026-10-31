import { Heading, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";
import { INSTANT_PAYOUT_FEE_LABEL } from "../../payoutFee";

interface BigTenWelcomeEmailProps {
    firstName?: string;
    heroImageUrl?: string; // optional banner, falls back to the typographic hero
}

const EXPECTATIONS = [
    {
        title: "Set up a live and active profile.",
        desc: "Your profile should include at least one published service.",
    },
    {
        title: "Connect your account with Stripe",
        desc: "Have a Stripe account connected and Payout information set up, so you can get paid swiftly for all your bookings.",
    },
    {
        title: "Complete a booking process, from start to finish;",
        desc: "Accept, complete bookings and deliver service exactly as you would for all your paying clients.",
    },
    {
        title: "Leave us an HONEST feedback on your user experience - NO HOLDING BACK.",
        desc: "Leave us quick daily user check-in reports, as well as reports on any bugs/issues you may notice in the app.",
    },
];

const HIGHLIGHTS = [
    {
        title: "Custom quotes",
        desc: "Clients can request a custom quote and share the budget they have in mind. You can send back a counter-offer, so you never undercharge for your work.",
    },
    {
        title: "Instant payouts",
        desc: `Withdraw from the Earnings screen and choose Instant to get your money in about 30 minutes, for a ${INSTANT_PAYOUT_FEE_LABEL}. It needs a debit card linked to your Stripe account. Standard payouts are free and arrive in about 2 business days.`,
    },
];

const CONTACT_FIELDS = ["Phone number:", "OR Email:", "Time window:"];

const Hero = ({ imageUrl }: { imageUrl?: string }) =>
    imageUrl ? (
        <Img
            src={imageUrl}
            alt="Welcome to the Wondar Big Ten"
            width="100%"
            style={heroImage}
        />
    ) : (
        <Section style={hero}>
            <Text style={heroLabel}>Wondar · Big Ten</Text>
            <Heading style={heroTitle}>You&apos;re in.</Heading>
            <Text style={heroSub}>
                You&apos;ve been selected for the Wondar Big Ten.
            </Text>
        </Section>
    );

const ExpectationList = () => (
    <Section style={{ margin: "8px 0 24px" }}>
        {EXPECTATIONS.map((item, i) => (
            <Section key={item.title} style={expectRow}>
                <Text style={expectTitle}>
                    <span style={expectNum}>0{i + 1}</span> {item.title}
                </Text>
                <Text style={expectDesc}>{item.desc}</Text>
            </Section>
        ))}
    </Section>
);

export const BigTenWelcomeEmail = ({
    firstName,
    heroImageUrl,
}: BigTenWelcomeEmailProps) => (
    <EmailLayout preview="You've been selected for the Wondar Big Ten 🎉">
        <Hero imageUrl={heroImageUrl} />

        <Text style={paragraph}>Hi {firstName || "there"},</Text>
        <Text style={paragraph}>
            Welcome to the Wondar Big Ten. You&apos;re one of the first
            creatives to use Wondar, and your experience will help shape it
            before it is opened up to everyone else.
        </Text>

        <Heading as="h2" style={sectionTitle}>
            What we&apos;re asking of you
        </Heading>
        <Text style={paragraph}>
            Take Wondar for a real live run. By the end of the program,
            we&apos;d love for you to:
        </Text>
        <ExpectationList />

        <Heading as="h2" style={sectionTitle}>
            Two features worth trying
        </Heading>
        <Section style={{ margin: "8px 0 24px" }}>
            {HIGHLIGHTS.map(item => (
                <Section key={item.title} style={expectRow}>
                    <Text style={expectTitle}>{item.title}</Text>
                    <Text style={expectDesc}>{item.desc}</Text>
                </Section>
            ))}
        </Section>

        <Section style={nextCard}>
            <Text style={nextTitle}>What happens next</Text>
            <Text style={nextText}>
                Please reply to this email with your most effective method of
                contact, and the best time window to reach you.
            </Text>
            {CONTACT_FIELDS.map(field => (
                <Text key={field} style={contactField}>
                    {field}
                </Text>
            ))}
            <Text style={{ ...nextText, margin: "14px 0 0" }}>
                Next, you&apos;ll get a second email with your starter guide and
                step-by-step instructions on exactly what to do to get started.
                SO KEEP AN EYE OUT FOR THAT EMAIL
            </Text>
        </Section>
        <Text style={paragraph}>We appreciate you deeply.</Text>
        <Text style={paragraph}>
            Keep an eye on your inbox, and check spam just in case.
        </Text>

        <Text style={paragraph}>We&apos;re glad to have you with us.</Text>
        <Text style={signature}>— The Wondar Team</Text>
    </EmailLayout>
);

const hero = {
    backgroundColor: "#2D5A3D",
    borderRadius: "16px",
    padding: "40px 28px",
    margin: "0 0 28px",
};
const heroImage = { borderRadius: "16px", margin: "0 0 28px" };
const heroLabel = {
    color: "#a7f3d0",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 12px",
};
const heroTitle = {
    color: "#E4F97C",
    fontSize: "52px",
    fontWeight: "700",
    lineHeight: "56px",
    letterSpacing: "-1px",
    margin: "0 0 12px",
};
const heroSub = { color: "#d1fae5", fontSize: "16px", margin: "0" };
const paragraph = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};
const sectionTitle = {
    color: "#1A2E1A",
    fontSize: "20px",
    fontWeight: "700",
    margin: "28px 0 8px",
};
const expectRow = {
    borderLeft: "3px solid #5BD300",
    padding: "2px 0 2px 14px",
    margin: "0 0 14px",
};
const expectNum = { color: "#5BD300", fontWeight: "700" };
const expectTitle = {
    color: "#1A2E1A",
    fontSize: "15px",
    fontWeight: "600",
    margin: "0 0 2px",
};
const expectDesc = {
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
};
const nextCard = {
    backgroundColor: "#f8fdf8",
    borderRadius: "14px",
    padding: "20px 22px",
    margin: "8px 0 24px",
};
const nextTitle = {
    color: "#2D5A3D",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 6px",
};
const nextText = {
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
};
const contactField = {
    color: "#1A2E1A",
    fontSize: "14px",
    fontWeight: "600",
    borderBottom: "1px dashed #9ca3af",
    padding: "10px 0 2px",
    margin: "0",
};
const signature = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};

export default BigTenWelcomeEmail;
