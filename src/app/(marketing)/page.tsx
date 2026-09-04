import { Features, Hero, HowItWorks, ForCreatives } from "@/components/landing";
import { BetaTesters } from "@/components/landing/beta-testers";
import { SmoothScrollProvider } from "@/lib/hooks/use-smooth-scroll";
import { Suspense } from "react";

export default function LandingPage() {
    return (
        <SmoothScrollProvider>
            <Suspense fallback={null}>
                <main className="min-h-screen bg-white">
                    <Hero />
                    <Features />
                    <HowItWorks />
                    <ForCreatives />
                    <BetaTesters />
                </main>
            </Suspense>
        </SmoothScrollProvider>
    );
}
