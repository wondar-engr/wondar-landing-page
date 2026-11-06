import { ContactForm } from "@/components/landing/contact-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Wondar",
    description:
        "Questions, partnerships or anything else. Send the Wondar team a message.",
};

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white">
            <section className="pt-32 pb-12 px-4 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-slate mb-4">
                    Get in touch
                </h1>
                <p className="text-lg text-slate/60">
                    Have a question or want to work with us? Send us a message
                    and the Wondar team will get back to you.
                </p>
            </section>
            <ContactForm />
        </main>
    );
}
