"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Static Background Blobs - No animation, just CSS */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime/30 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-forest-green/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-lime/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content - Single animation on mount only */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 bg-lime/30 text-forest-green px-4 py-2 rounded-full text-sm font-medium mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-green opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-green"></span>
                            </span>
                            Coming Soon
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate leading-tight mb-6">
                            Book Creative Services,{" "}
                            <span className="text-forest-green">On-Demand</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate/70 mb-8 max-w-xl mx-auto lg:mx-0">
                            Connect with talented creatives for hair, makeup,
                            photography & more. Find the perfect professional
                            near you and book instantly.
                        </p>

                        <div id="waitlist" className="max-w-md mx-auto lg:mx-0">
                            <WaitlistForm />
                        </div>

                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate/60">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-forest-green"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Free to join
                            </div>
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-forest-green"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                No spam, ever
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Content - Phone Mockups with CSS animations */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative w-full h-[650px]">
                            {/* Main Phone - Center */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-20 animate-float">
                                <PhoneMockup
                                    src="/images/screenshots/home.png"
                                    alt="Wondar App - Discover Creatives"
                                    priority
                                    size="large"
                                />
                            </div>

                            {/* Left Phone */}
                            <div className="absolute -left-4 top-24 z-10 animate-float-slow">
                                <PhoneMockup
                                    src="/images/screenshots/map-view.png"
                                    alt="Wondar App - Map View"
                                    size="small"
                                    opacity={0.85}
                                />
                            </div>

                            {/* Right Phone */}
                            <div className="absolute -right-4 top-16 z-10 animate-float-delayed">
                                <PhoneMockup
                                    src="/images/screenshots/profile.png"
                                    alt="Wondar App - Creative Profile"
                                    size="small"
                                    opacity={0.85}
                                />
                            </div>

                            {/* Background Phone */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-8 z-0 animate-float-slow">
                                <PhoneMockup
                                    src="/images/screenshots/booking.png"
                                    alt="Wondar App - Booking Review"
                                    size="small"
                                    opacity={0.4}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Mobile: Single Phone Display */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="lg:hidden flex justify-center"
                    >
                        <div className="animate-float">
                            <PhoneMockup
                                src="/images/screenshots/home.png"
                                alt="Wondar App"
                                size="medium"
                                priority
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// Phone Mockup Component
interface PhoneMockupProps {
    src: string;
    alt: string;
    size?: "small" | "medium" | "large";
    priority?: boolean;
    opacity?: number;
}

function PhoneMockup({
    src,
    alt,
    size = "medium",
    priority = false,
    opacity = 1,
}: PhoneMockupProps) {
    const sizes = {
        small: {
            width: 200,
            height: 410,
            frame: "2.2rem",
            inner: "1.8rem",
            notch: "w-12 h-3",
        },
        medium: {
            width: 240,
            height: 490,
            frame: "2.5rem",
            inner: "2.1rem",
            notch: "w-16 h-4",
        },
        large: {
            width: 280,
            height: 570,
            frame: "3rem",
            inner: "2.5rem",
            notch: "w-20 h-5",
        },
    };

    const s = sizes[size];

    return (
        <div style={{ opacity }} className="relative will-change-transform">
            {/* Phone Frame */}
            <div
                className="bg-slate p-2.5 shadow-2xl"
                style={{
                    width: s.width,
                    height: s.height,
                    borderRadius: s.frame,
                }}
            >
                {/* Screen */}
                <div
                    className="w-full h-full bg-black overflow-hidden relative"
                    style={{ borderRadius: s.inner }}
                >
                    {/* Dynamic Island / Notch */}
                    <div
                        className={`absolute top-2 left-1/2 -translate-x-1/2 ${s.notch} bg-black rounded-full z-20`}
                    />

                    {/* Screenshot Image */}
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-cover object-top"
                        priority={priority}
                        sizes={`${s.width}px`}
                    />
                </div>
            </div>

            {/* Simplified Glow - Static */}
            <div
                className="absolute -inset-4 bg-gradient-to-b from-lime/15 to-transparent rounded-[3.5rem] -z-10 blur-2xl"
                style={{ opacity: opacity * 0.5 }}
            />
        </div>
    );
}
