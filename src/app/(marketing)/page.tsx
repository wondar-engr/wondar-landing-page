import { Features, Hero, HowItWorks, ForCreatives } from "@/components/landing";
import { SmoothScrollProvider } from "@/lib/hooks/use-smooth-scroll";

export default function LandingPage() {
    return (
        <SmoothScrollProvider>
            <main className="min-h-screen bg-white">
                <Hero />
                <Features />
                <HowItWorks />
                <ForCreatives />
            </main>
        </SmoothScrollProvider>
    );
}
