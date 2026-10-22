import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/emailLayout";

export const DeletionRequestEmail = () => (
    <EmailLayout preview="We received your account deletion request">
        <Section style={{ padding: "24px 0 8px" }}>
            <Heading style={h}>We received your request</Heading>
        </Section>
        <Text style={p}>
            We received a request to delete the Wondar App account linked to
            this email address.
        </Text>
        <Text style={p}>
            Our team will verify the request and delete your account and
            associated data within 30 days. Payment and transaction records may
            be retained where financial regulations require it.
        </Text>
        <Text style={p}>
            <strong>Didn&apos;t make this request?</strong> Reply to this
            message or email support@wondarapp.com and we&apos;ll cancel it.
        </Text>
        <Text style={sig}>— The Wondar Team</Text>
    </EmailLayout>
);

const h = {
    color: "#1A2E1A",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0",
};
const p = {
    color: "#1A2E1A",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
};
const sig = {
    color: "#6b7280",
    fontSize: "14px",
    fontStyle: "italic" as const,
    margin: "0",
};
