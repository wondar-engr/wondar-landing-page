"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "information-we-collect", title: "Information We Collect" },
    { id: "how-we-use", title: "How We Use Your Information" },
    { id: "information-sharing", title: "Information Sharing" },
    { id: "data-security", title: "Data Security" },
    { id: "your-rights", title: "Your Rights" },
    { id: "data-retention", title: "Data Retention" },
    { id: "cookies", title: "Cookies and Tracking" },
    { id: "children", title: "Children's Privacy" },
    { id: "changes", title: "Changes to This Policy" },
    { id: "contact", title: "Contact Us" },
];

export default function PrivacyPage() {
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
                            Privacy Policy
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
                                <nav className="space-y-2">
                                    {sections.map((section) => (
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
                            <section id="introduction" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    1. Introduction
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    Welcome to Wondar (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). Wondar is a marketplace
                                    platform that connects clients with creative professionals including hairstylists,
                                    makeup artists, photographers, nail technicians, and other service providers for
                                    on-demand services.
                                </p>
                                <p className="text-slate/80 leading-relaxed">
                                    This Privacy Policy explains how we collect, use, disclose, and safeguard your
                                    information when you use our mobile application and website (collectively, the
                                    &quot;Platform&quot;). By using Wondar, you agree to the collection and use of information
                                    in accordance with this policy.
                                </p>
                            </section>

                            {/* Section 2 */}
                            <section id="information-we-collect" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    2. Information We Collect
                                </h2>

                                <h3 className="text-lg font-semibold text-slate mb-3 mt-6">
                                    Personal Information (Clients)
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    When you register as a client, we collect:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>Name, email address, and phone number</li>
                                    <li>Profile photo (optional)</li>
                                    <li>Location data (to find nearby creatives)</li>
                                    <li>Payment information (processed securely via Stripe—we do not store card details)</li>
                                    <li>Booking history and preferences</li>
                                    <li>Device information and push notification tokens</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Personal Information (Creatives/Service Providers)
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    When you register as a creative, we additionally collect:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>Business name and description</li>
                                    <li>Profile and portfolio photos</li>
                                    <li>Work address and service locations</li>
                                    <li>Government-issued ID (for verification purposes)</li>
                                    <li>Bank account details (for payouts via Stripe Connect)</li>
                                    <li>Service offerings, pricing, and availability</li>
                                    <li>Reviews and ratings received</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Automatically Collected Information
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We automatically collect certain information when you use our Platform:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Device type, operating system, and version</li>
                                    <li>IP address and general location</li>
                                    <li>App usage analytics and interactions</li>
                                    <li>Crash reports and performance data</li>
                                </ul>
                            </section>

                            {/* Section 3 */}
                            <section id="how-we-use" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    3. How We Use Your Information
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We use the information we collect to:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Facilitate bookings between clients and creatives</li>
                                    <li>Process payments and payouts securely</li>
                                    <li>Send booking confirmations, reminders, and notifications</li>
                                    <li>Improve and personalize our services</li>
                                    <li>Provide customer support</li>
                                    <li>Verify creative identities and credentials</li>
                                    <li>Prevent fraud and ensure platform safety</li>
                                    <li>Send marketing communications (with your consent)</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </section>

                            {/* Section 4 */}
                            <section id="information-sharing" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    4. Information Sharing
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    We may share your information in the following circumstances:
                                </p>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    With Other Users
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-6">
                                    Limited profile information (such as name, photo, and reviews) is visible to
                                    other users to facilitate bookings and build trust in the marketplace.
                                </p>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    With Service Providers
                                </h3>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li><strong>Stripe:</strong> For secure payment processing</li>
                                    <li><strong>Cloud Services:</strong> For hosting and data storage</li>
                                    <li><strong>Analytics Providers:</strong> For app improvement</li>
                                </ul>

                                <h3 className="text-lg font-semibold text-slate mb-3">
                                    Legal Requirements
                                </h3>
                                <p className="text-slate/80 leading-relaxed mb-6">
                                    We may disclose information if required by law, court order, or government request,
                                    or to protect our rights, safety, or property.
                                </p>

                                <div className="bg-lime/20 p-4 rounded-xl border-l-4 border-forest-green">
                                    <p className="text-slate font-semibold">
                                        We do NOT sell your personal data to third parties.
                                    </p>
                                </div>
                            </section>

                            {/* Section 5 */}
                            <section id="data-security" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    5. Data Security
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We implement appropriate security measures to protect your information:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                                    <li>Secure authentication with password hashing</li>
                                    <li>Regular security audits and vulnerability assessments</li>
                                    <li>Stripe handles all payment data (PCI-DSS compliant)</li>
                                    <li>Access controls and employee training</li>
                                </ul>
                                <p className="text-slate/80 leading-relaxed">
                                    While we strive to protect your information, no method of transmission over the
                                    internet is 100% secure. We cannot guarantee absolute security.
                                </p>
                            </section>

                            {/* Section 6 */}
                            <section id="your-rights" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    6. Your Rights
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    You have the following rights regarding your personal information:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li><strong>Access:</strong> Request a copy of your data</li>
                                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                                    <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                                    <li><strong>Export:</strong> Download your data in a portable format</li>
                                    <li><strong>Restriction:</strong> Limit how we process your data</li>
                                </ul>
                                <p className="text-slate/80 leading-relaxed">
                                    To exercise these rights, contact us at{" "}
                                    <a
                                        href="mailto:privacy@wondarapp.com"
                                        className="text-forest-green hover:underline"
                                    >
                                        privacy@wondarapp.com
                                    </a>.
                                </p>
                            </section>

                            {/* Section 7 */}
                            <section id="data-retention" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    7. Data Retention
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We retain your information as follows:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 ml-4">
                                    <li>Account data is kept while your account is active</li>
                                    <li>Upon account deletion request, data is removed within 30 days</li>
                                    <li>Some data may be retained longer for legal, tax, or audit purposes</li>
                                    <li>Aggregated, anonymized data may be retained indefinitely for analytics</li>
                                </ul>
                            </section>

                            {/* Section 8 */}
                            <section id="cookies" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    8. Cookies and Tracking
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We use cookies and similar technologies for:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li><strong>Essential cookies:</strong> Required for platform functionality</li>
                                    <li><strong>Analytics cookies:</strong> To understand how users interact with our platform (with consent)</li>
                                    <li><strong>Preference cookies:</strong> To remember your settings</li>
                                </ul>
                                <p className="text-slate/80 leading-relaxed">
                                    You can manage cookie preferences through your browser settings. Note that
                                    disabling certain cookies may affect platform functionality.
                                </p>
                            </section>

                            {/* Section 9 */}
                            <section id="children" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    9. Children&apos;s Privacy
                                </h2>
                                <p className="text-slate/80 leading-relaxed">
                                    Wondar is not intended for users under 18 years of age. We do not knowingly
                                    collect personal information from minors. If you believe a child has provided
                                    us with personal information, please contact us immediately, and we will take
                                    steps to delete such information.
                                </p>
                            </section>

                            {/* Section 10 */}
                            <section id="changes" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    10. Changes to This Policy
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-3">
                                    We may update this Privacy Policy from time to time. We will notify you of
                                    significant changes by:
                                </p>
                                <ul className="list-disc list-inside text-slate/80 space-y-2 mb-6 ml-4">
                                    <li>Posting the updated policy on our Platform</li>
                                    <li>Sending an email notification</li>
                                    <li>Displaying an in-app notification</li>
                                </ul>
                                <p className="text-slate/80 leading-relaxed">
                                    Your continued use of Wondar after changes are posted constitutes acceptance
                                    of the updated policy.
                                </p>
                            </section>

                            {/* Section 11 */}
                            <section id="contact" className="mb-12 scroll-mt-24">
                                <h2 className="text-2xl font-bold text-slate mb-4">
                                    11. Contact Us
                                </h2>
                                <p className="text-slate/80 leading-relaxed mb-4">
                                    If you have questions about this Privacy Policy or want to exercise your
                                    privacy rights, please contact us:
                                </p>
                                <ul className="text-slate/80 space-y-2 ml-4">
                                    <li>
                                        <strong>Email:</strong>{" "}
                                        <a
                                            href="mailto:privacy@wondarapp.com"
                                            className="text-forest-green hover:underline"
                                        >
                                            privacy@wondarapp.com
                                        </a>
                                    </li>
                                    <li>
                                        <strong>General Support:</strong>{" "}
                                        <a
                                            href="mailto:support@wondarapp.com"
                                            className="text-forest-green hover:underline"
                                        >
                                            support@wondarapp.com
                                        </a>
                                    </li>
                                </ul>
                                <p className="text-slate/80 leading-relaxed mt-4">
                                    We will respond to your request within 30 days.
                                </p>
                            </section>
                        </motion.article>
                    </div>
                </div>
            </div>
        </main>
    );
}