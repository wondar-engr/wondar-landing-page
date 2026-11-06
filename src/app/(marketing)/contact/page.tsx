import { ContactForm } from "@/components/landing/contact-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Wondar",
    description:
        "Can't get into the Wondar app, or something isn't working? Tell us here.",
};

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white">
            <section className="pt-32 pb-12 px-4 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-slate mb-4">
                    Tell us what&apos;s going wrong
                </h1>
                <p className="text-lg text-slate/60">
                    Can&apos;t log in, or something isn&apos;t working? Send us
                    the details and the Wondar team will follow up.
                </p>
            </section>
            <ContactForm />
        </main>
    );
}
