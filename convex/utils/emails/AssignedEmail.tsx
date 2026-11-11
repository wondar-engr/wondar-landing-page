import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/emailLayout";

interface AssignedEmailProps {
  firstName?: string;
  assignedBy: string;
  kind: string;
  title: string;
  url: string;
}

// Sent to an admin when something is assigned to them
export const AssignedEmail = ({
  firstName,
  assignedBy,
  kind,
  title,
  url,
}: AssignedEmailProps) => (
  <EmailLayout preview={`${assignedBy} assigned you a ${kind}`}>
    <Section style={{ padding: "8px 0 0" }}>
      <Text style={paragraph}>Hi {firstName || "there"},</Text>
      <Text style={paragraph}>
        {assignedBy} assigned a {kind} to you:
      </Text>
      <Text style={titleStyle}>{title}</Text>
      <Button style={button} href={url}>
        Open in the admin
      </Button>
    </Section>
  </EmailLayout>
);

const paragraph = {
  color: "#1A2E1A",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};
const titleStyle = {
  ...paragraph,
  fontWeight: 600,
  background: "#f3f4f6",
  borderRadius: "8px",
  padding: "12px 14px",
};
const button = {
  backgroundColor: "#1A2E1A",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  padding: "12px 20px",
  textDecoration: "none",
};

export default AssignedEmail;
