import { TesterForm } from "@/components/landing/tester-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Become a Wondar Tester",
    description:
        "Join our exclusive beta testing group and help shape Wondar before launch.",
};

export default function TesterPage() {
    return (
        <main className="min-h-screen bg-white">
            <TesterHero />
            <TesterForm />
        </main>
    );
}

function TesterHero() {
    return (
        <section className="pt-32 pb-16 px-4 text-center max-w-2xl mx-auto">
            <span className="inline-block bg-lime/30 text-forest-green px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                Beta Testers
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate mb-4 leading-tight">
                Help us build something great
            </h1>
            <p className="text-lg text-slate/60 max-w-xl mx-auto">
                We&apos;re looking for real people to test Wondar before launch.
                You&apos;ll get early access, and your feedback will directly
                shape the app.
            </p>
        </section>
    );
}
