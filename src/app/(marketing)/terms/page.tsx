"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const sections = [
    { id: "introduction", title: "Introduction & Acceptance" },
    { id: "platform-role", title: "Platform Role" },
    { id: "accounts", title: "Account Registration" },
    { id: "booking-terms", title: "Booking & Service Terms" },
    { id: "payments", title: "Payments" },
    { id: "cancellation", title: "Cancellation Policy" },
    { id: "refunds", title: "Refunds & Disputes" },
    { id: "conduct", title: "User Conduct" },
    { id: "reviews", title: "Reviews & Ratings" },
    { id: "ip", title: "Intellectual Property" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "indemnification", title: "Indemnification" },
    { id: "termination", title: "Termination" },
    { id: "changes", title: "Changes to Terms" },
    { id: "governing-law", title: "Governing Law" },
    { id: "contact", title: "Contact" },
];

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8"
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-forest-green hover:text-forest-green/80 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <h1 className="text-4xl font-bold text-slate mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-slate/60">
                            Last updated: April 18, 2026
                        </p>
                    </motion.div>

                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Table of Contents - Sticky Sidebar */}
                        <motion.aside
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:w-64 shrink-0"
                        >
                            <div className="lg:sticky lg:top-24">
                                <h2 className="text-sm font-semibold text-slate uppercase tracking-wider mb-4">
                                    On This Page
                                </h2>
                                <nav className="space-y-2 max-h-[70vh] overflow-y-auto">
                                    {sections.map(section => (
                                        <a
                                            key={section.id}
                                            href={`#${section.id}`}
                                            className="block text-sm text-slate/60 hover:text-forest-green transition-colors py-1"
                                        >
                                            {section.title}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </motion.aside>

                        {/* Content */}
                        <motion.article
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1"
                        >
                            {/* Section 1 */}
                            <section
                                id="introduction"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    1. Introduction & Acceptance
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    Welcome to Wondar. These Terms of Service
                                    (&quot;Terms&quot;) govern your use of the
                                    Wondar mobile application and website
                                    (collectively, the &quot;Platform&quot;). By
                                    accessing or using Wondar, you agree to be
                                    bound by these Terms.
                                </p>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    <strong className="text-slate">
                                        You must be at least 18 years old to use
                                        Wondar.
                                    </strong>{" "}
                                    By using the Platform, you represent and
                                    warrant that you meet this age requirement.
                                </p>
                                <p className="text-slate/80 leading-relaxed">
                                    Wondar is a marketplace platform that
                                    connects clients seeking creative services
                                    with independent creative professionals
                                    (&quot;Creatives&quot;) who offer those
                                    services.
                                </p>
                            </section>

                            {/* Section 2 */}
                            <section
                                id="platform-role"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    2. Platform Role
                                </h2>
                                <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-500 mb-6">
                                    <p className="font-semibold text-amber-800 mb-1">
                                        Important Notice
                                    </p>
                                    <p className="text-amber-700 text-sm">
                                        Wondar is a marketplace only. We are NOT
                                        the service provider.
                                    </p>
                                </div>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Creatives are independent contractors,
                                        not Wondar employees
                                    </li>
                                    <li>
                                        We facilitate connections and payments
                                        between users
                                    </li>
                                    <li>
                                        We do not guarantee the quality, safety,
                                        or legality of services
                                    </li>
                                    <li>
                                        Disputes are primarily between the
                                        client and creative, though we may
                                        assist in mediation
                                    </li>
                                    <li>
                                        Creatives are responsible for their own
                                        business operations, including taxes and
                                        compliance
                                    </li>
                                </ul>
                            </section>

                            {/* Section 3 */}
                            <section
                                id="accounts"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    3. Account Registration
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    All Users
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        You must provide accurate, current, and
                                        complete information
                                    </li>
                                    <li>
                                        You are responsible for maintaining
                                        account security
                                    </li>
                                    <li>
                                        One account per person—multiple accounts
                                        are prohibited
                                    </li>
                                    <li>
                                        You must not share your account
                                        credentials
                                    </li>
                                    <li>
                                        You are responsible for all activities
                                        under your account
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Creative Accounts
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    In addition to the above, Creatives must:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Be legally eligible to provide the
                                        services offered
                                    </li>
                                    <li>
                                        Hold any necessary licenses,
                                        certifications, or permits
                                    </li>
                                    <li>
                                        Complete our identity verification
                                        process
                                    </li>
                                    <li>
                                        Set up Stripe Connect for receiving
                                        payouts
                                    </li>
                                    <li>
                                        Be responsible for their own tax
                                        obligations
                                    </li>
                                </ul>
                            </section>

                            {/* Section 4 */}
                            <section
                                id="booking-terms"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    4. Booking & Service Terms
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    For Clients
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        Bookings are requests until accepted by
                                        the Creative
                                    </li>
                                    <li>
                                        You must provide accurate booking
                                        details (location, time, requirements)
                                    </li>
                                    <li>
                                        You must be available at the scheduled
                                        time and location
                                    </li>
                                    <li>
                                        Respectful and appropriate behavior is
                                        required at all times
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    For Creatives
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Respond to booking requests within 24
                                        hours (or they may auto-cancel)
                                    </li>
                                    <li>Honor all confirmed bookings</li>
                                    <li>
                                        Provide services as described in your
                                        listings
                                    </li>
                                    <li>
                                        Maintain accurate availability calendars
                                    </li>
                                    <li>
                                        Arrive on time and professionally
                                        prepared
                                    </li>
                                </ul>
                            </section>

                            {/* Section 5 */}
                            <section
                                id="payments"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    5. Payments
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    General
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        All payments are processed securely
                                        through Stripe
                                    </li>
                                    <li>
                                        Prices displayed include the service fee
                                    </li>
                                    <li>
                                        A non-refundable booking fee is charged
                                        at the time of booking
                                    </li>
                                    <li>
                                        The service fee is charged after the
                                        Creative confirms the booking
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Platform Fees
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-6">
                                    Wondar charges a platform fee to facilitate
                                    the marketplace and maintain the Platform.
                                    Fee structures may be updated with
                                    reasonable notice to users.
                                </p>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Payouts to Creatives
                                </h3>
                                <p className="text-slate/80 leading-relaxed">
                                    Creatives receive payouts through Stripe
                                    Connect according to their payout schedule
                                    settings. Processing times depend on your
                                    bank and location.
                                </p>
                            </section>

                            {/* Section 6 */}
                            <section
                                id="cancellation"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    6. Cancellation Policy
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Client Cancellations
                                </h3>
                                <div className="overflow-x-auto mb-6">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left p-3 font-semibold text-slate border-b">
                                                    Timeframe
                                                </th>
                                                <th className="text-left p-3 font-semibold text-slate border-b">
                                                    Service Fee Refund
                                                </th>
                                                <th className="text-left p-3 font-semibold text-slate border-b">
                                                    Booking Fee
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="p-3 text-slate/80 border-b">
                                                    48+ hours before service
                                                </td>
                                                <td className="p-3 text-green-600 font-medium border-b">
                                                    100% refund
                                                </td>
                                                <td className="p-3 text-red-600 border-b">
                                                    Non-refundable
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 text-slate/80 border-b">
                                                    24-48 hours before service
                                                </td>
                                                <td className="p-3 text-amber-600 font-medium border-b">
                                                    50% refund
                                                </td>
                                                <td className="p-3 text-red-600 border-b">
                                                    Non-refundable
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 text-slate/80 border-b">
                                                    Less than 24 hours
                                                </td>
                                                <td className="p-3 text-red-600 font-medium border-b">
                                                    No refund
                                                </td>
                                                <td className="p-3 text-red-600 border-b">
                                                    Non-refundable
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-sm text-slate/60 mb-6">
                                    Cancellation time is calculated from the
                                    scheduled service start time.
                                </p>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Creative Cancellations
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        If a Creative cancels for any reason,
                                        the client receives a{" "}
                                        <strong>100% full refund</strong>{" "}
                                        (including booking fee)
                                    </li>
                                    <li>
                                        Creatives should avoid cancellations as
                                        it negatively affects their rating and
                                        visibility
                                    </li>
                                    <li>
                                        Repeated cancellations may result in
                                        account suspension
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    No-Shows
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        <strong>Client no-show:</strong>{" "}
                                        Creative keeps full payment; client
                                        receives no refund
                                    </li>
                                    <li>
                                        <strong>Creative no-show:</strong>{" "}
                                        Client receives 100% full refund plus
                                        potential compensation
                                    </li>
                                </ul>
                            </section>

                            {/* Section 7 */}
                            <section
                                id="refunds"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    7. Refunds & Disputes
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Refund Processing
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        Refunds are processed within 5-10
                                        business days
                                    </li>
                                    <li>
                                        Refunds are returned to the original
                                        payment method
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Disputes
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        Disputes must be raised within 24 hours
                                        of service completion
                                    </li>
                                    <li>
                                        Contact support with details and any
                                        supporting evidence (photos, messages)
                                    </li>
                                    <li>
                                        Wondar will review and may mediate
                                        between parties
                                    </li>
                                    <li>
                                        Final decisions are at Wondar&apos;s
                                        discretion
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Valid Grounds for Dispute
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Service not provided as described</li>
                                    <li>Creative no-show</li>
                                    <li>
                                        Significantly unsatisfactory service
                                        quality
                                    </li>
                                    <li>
                                        Safety concerns or inappropriate
                                        behavior
                                    </li>
                                </ul>
                            </section>

                            {/* Section 8 */}
                            <section
                                id="conduct"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    8. User Conduct
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Prohibited Behavior
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    All users are prohibited from:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>
                                        Harassment, discrimination, or abusive
                                        behavior
                                    </li>
                                    <li>
                                        Fraudulent activity or misrepresentation
                                    </li>
                                    <li>
                                        Sharing false or misleading information
                                    </li>
                                    <li>
                                        Circumventing platform payments
                                        (off-platform transactions)
                                    </li>
                                    <li>Creating fake reviews or ratings</li>
                                    <li>
                                        Violating others&apos; privacy or
                                        intellectual property
                                    </li>
                                    <li>
                                        Using the platform for illegal
                                        activities
                                    </li>
                                    <li>
                                        Attempting to manipulate search rankings
                                        or algorithms
                                    </li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Consequences
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    Violations may result in:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Warning or notice</li>
                                    <li>Temporary account suspension</li>
                                    <li>Permanent account ban</li>
                                    <li>Legal action where appropriate</li>
                                </ul>
                            </section>

                            {/* Section 9 */}
                            <section
                                id="reviews"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    9. Reviews & Ratings
                                </h2>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Reviews must be honest and based on
                                        actual service experiences
                                    </li>
                                    <li>
                                        Fake or incentivized reviews are
                                        prohibited
                                    </li>
                                    <li>
                                        Reviews containing harassment,
                                        discrimination, or irrelevant content
                                        may be removed
                                    </li>
                                    <li>
                                        Both clients and creatives can respond
                                        to reviews
                                    </li>
                                    <li>
                                        Wondar reserves the right to remove
                                        reviews that violate our guidelines
                                    </li>
                                </ul>
                            </section>

                            {/* Section 10 */}
                            <section id="ip" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    10. Intellectual Property
                                </h2>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Wondar owns all Platform intellectual
                                        property (logo, design, code, branding)
                                    </li>
                                    <li>
                                        Users retain rights to their own content
                                        (photos, descriptions, portfolio work)
                                    </li>
                                    <li>
                                        By posting content, you grant Wondar a
                                        license to display it on the Platform
                                    </li>
                                    <li>
                                        You may not copy, modify, or distribute
                                        Wondar&apos;s intellectual property
                                    </li>
                                </ul>
                            </section>

                            {/* Section 11 */}
                            <section
                                id="liability"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    11. Limitation of Liability
                                </h2>
                                <div className="bg-slate/5 p-4 rounded-xl mb-6">
                                    <p className="text-sm text-slate/80 uppercase tracking-wide font-medium">
                                        To the maximum extent permitted by law:
                                    </p>
                                </div>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        Wondar is a marketplace platform, not a
                                        service provider
                                    </li>
                                    <li>
                                        We do not guarantee the quality, safety,
                                        or legality of services
                                    </li>
                                    <li>
                                        We are not liable for disputes,
                                        injuries, or damages arising from
                                        services
                                    </li>
                                    <li>
                                        Users use the Platform at their own risk
                                    </li>
                                    <li>
                                        Our maximum liability is limited to the
                                        fees you have paid to Wondar
                                    </li>
                                    <li>
                                        We are not liable for indirect,
                                        incidental, or consequential damages
                                    </li>
                                </ul>
                            </section>

                            {/* Section 12 */}
                            <section
                                id="indemnification"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    12. Indemnification
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    You agree to indemnify, defend, and hold
                                    harmless Wondar, its officers, directors,
                                    employees, and agents from any claims,
                                    damages, losses, or expenses (including
                                    legal fees) arising from:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Your use of the Platform</li>
                                    <li>Your violation of these Terms</li>
                                    <li>
                                        Your violation of any third-party rights
                                    </li>
                                    <li>
                                        Services you provide or receive through
                                        the Platform
                                    </li>
                                </ul>
                            </section>

                            {/* Section 13 */}
                            <section
                                id="termination"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    13. Termination
                                </h2>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        You may delete your account at any time
                                        through the app settings
                                    </li>
                                    <li>
                                        Wondar may suspend or terminate accounts
                                        for Terms violations
                                    </li>
                                    <li>
                                        Outstanding payments must be settled
                                        before account closure
                                    </li>
                                    <li>
                                        Some provisions of these Terms survive
                                        termination
                                    </li>
                                </ul>
                            </section>

                            {/* Section 14 */}
                            <section
                                id="changes"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    14. Changes to Terms
                                </h2>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>
                                        We may update these Terms from time to
                                        time
                                    </li>
                                    <li>
                                        Material changes will be communicated
                                        via email or in-app notification
                                    </li>
                                    <li>
                                        Continued use after changes constitutes
                                        acceptance
                                    </li>
                                    <li>
                                        If you disagree with changes, you should
                                        stop using the Platform
                                    </li>
                                </ul>
                            </section>

                            {/* Section 15 */}
                            <section
                                id="governing-law"
                                className="mb-12 scroll-mt-24"
                            >
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    15. Governing Law
                                </h2>
                                <p className="text-slate/80 leading-relaxed">
                                    These Terms are governed by and construed in
                                    accordance with the laws of Nigeria. Any
                                    disputes arising from these Terms or your
                                    use of the Platform shall be resolved in the
                                    courts of Nigeria.
                                </p>
                            </section>

                            {/* Section 16 */}
                            <section id="contact" className="scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    16. Contact
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    For questions about these Terms of Service,
                                    please contact us:
                                </p>
                                <ul className="text-slate/80 space-y-2 ml-4">
                                    <li>
                                        <strong>Email:</strong>{" "}
                                        <a
                                            href="mailto:support@wondarapp.com"
                                            className="text-forest-green hover:underline"
                                        >
                                            support@wondarapp.com
                                        </a>
                                    </li>
                                    <li>
                                        <strong>Website:</strong>{" "}
                                        <a
                                            href="https://wondarapp.com"
                                            className="text-forest-green hover:underline"
                                        >
                                            wondarapp.com
                                        </a>
                                    </li>
                                </ul>
                            </section>
                        </motion.article>
                    </div>
                </div>
            </div>
        </main>
    );
}
