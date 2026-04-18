"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Search, CalendarCheck, CreditCard } from "lucide-react";

const steps = [
    {
        number: "01",
        icon: Search,
        title: "Search for creatives near you",
        description:
            "Browse by category, location, or availability. Filter by ratings, price, and more to find your perfect match.",
        illustration: (
            <div className="relative w-full h-48 bg-gradient-to-br from-lime/30 to-forest-green/10 rounded-2xl overflow-hidden">
                <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute top-6 left-6 right-6"
                >
                    <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full" />
                        <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded w-20 mb-1" />
                            <div className="h-2 bg-gray-100 rounded w-14" />
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    animate={{ x: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                    className="absolute top-20 left-8 right-8"
                >
                    <div className="bg-white/80 rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 bg-lime/50 rounded-full" />
                        <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded w-24 mb-1" />
                            <div className="h-2 bg-gray-100 rounded w-16" />
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                    className="absolute top-[136px] left-10 right-10"
                >
                    <div className="bg-white/60 rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 bg-forest-green/30 rounded-full" />
                        <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded w-16 mb-1" />
                            <div className="h-2 bg-gray-100 rounded w-12" />
                        </div>
                    </div>
                </motion.div>
            </div>
        ),
    },
    {
        number: "02",
        icon: CalendarCheck,
        title: "Browse services & book a time",
        description:
            "View portfolios, check real-time availability, and book your appointment in just a few taps.",
        illustration: (
            <div className="relative w-full h-48 bg-gradient-to-br from-forest-green/10 to-lime/30 rounded-2xl overflow-hidden p-4">
                <div className="bg-white rounded-xl p-4 shadow-sm h-full">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 bg-gray-200 rounded w-16" />
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="w-3 h-3 bg-lime rounded"
                                />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-3">
                        {Array.from({ length: 21 }).map((_, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.1 }}
                                className={`h-5 rounded text-[8px] flex items-center justify-center ${
                                    i === 10
                                        ? "bg-forest-green text-white"
                                        : "bg-gray-100"
                                }`}
                            >
                                {i + 1}
                            </motion.div>
                        ))}
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-forest-green text-white text-xs font-medium py-2 px-4 rounded-lg text-center"
                    >
                        Book Now
                    </motion.div>
                </div>
            </div>
        ),
    },
    {
        number: "03",
        icon: CreditCard,
        title: "Get the service & pay securely",
        description:
            "Enjoy your service and pay securely through the app. Leave a review to help others find great creatives.",
        illustration: (
            <div className="relative w-full h-48 bg-gradient-to-br from-lime/30 to-emerald-100 rounded-2xl overflow-hidden flex items-center justify-center">
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="bg-white rounded-2xl p-4 shadow-lg w-48"
                >
                    <div className="flex items-center justify-center mb-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: "spring",
                                delay: 0.5,
                            }}
                            className="w-12 h-12 bg-lime rounded-full flex items-center justify-center"
                        >
                            <svg
                                className="w-6 h-6 text-forest-green"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </motion.div>
                    </div>
                    <p className="text-center text-sm font-medium text-slate">
                        Payment Complete!
                    </p>
                    <p className="text-center text-xs text-slate/60 mt-1">
                        $85.00 paid securely
                    </p>
                </motion.div>
            </div>
        ),
    },
];

export function HowItWorks() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="how-it-works" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate mb-4">
                        How it <span className="text-forest-green">works</span>
                    </h2>
                    <p className="text-lg text-slate/70 max-w-2xl mx-auto">
                        Book your next creative service in three simple steps
                    </p>
                </motion.div>

                <div className="space-y-16 lg:space-y-24">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 40 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${
                                index % 2 === 1 ? "lg:flex-row-reverse" : ""
                            }`}
                        >
                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-3 mb-4">
                                    <span className="text-5xl font-bold text-lime">
                                        {step.number}
                                    </span>
                                    <div className="w-10 h-10 bg-forest-green/10 rounded-xl flex items-center justify-center">
                                        <step.icon className="w-5 h-5 text-forest-green" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-slate mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-slate/60 leading-relaxed max-w-md mx-auto lg:mx-0">
                                    {step.description}
                                </p>
                            </div>
                            <div className="flex-1 w-full max-w-md">
                                {step.illustration}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
