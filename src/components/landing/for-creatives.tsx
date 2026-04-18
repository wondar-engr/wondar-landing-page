"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingUp, CalendarDays, Zap } from "lucide-react";

const benefits = [
    {
        icon: TrendingUp,
        title: "Grow your business",
        description:
            "Get discovered by new clients in your area who are actively looking for your services.",
    },
    {
        icon: CalendarDays,
        title: "Manage bookings easily",
        description:
            "Keep track of all your appointments in one place. No more double bookings or missed messages.",
    },
    {
        icon: Zap,
        title: "Get paid fast",
        description:
            "Receive secure payments directly to your account. No more chasing invoices or handling cash.",
    },
];

export function ForCreatives() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section
            id="creatives"
            className="py-24 bg-forest-green relative overflow-hidden"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.2 }}
                        className="inline-block bg-lime text-forest-green px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                    >
                        For Creatives
                    </motion.span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Turn your talent into a thriving business
                    </h2>
                    <p className="text-lg text-white/80 max-w-2xl mx-auto">
                        Whether you&apos;re a hairstylist, makeup artist,
                        photographer, or any other creative professional—Wondar
                        helps you reach more clients and grow your income.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={benefit.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{
                                duration: 0.5,
                                delay: 0.2 + index * 0.1,
                            }}
                            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                        >
                            <div className="w-12 h-12 bg-lime rounded-xl flex items-center justify-center mb-4">
                                <benefit.icon className="w-6 h-6 text-forest-green" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {benefit.title}
                            </h3>
                            <p className="text-white/70 leading-relaxed">
                                {benefit.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-center"
                >
                    <a
                        href="#waitlist"
                        className="inline-flex items-center gap-2 bg-lime text-forest-green px-8 py-4 rounded-full font-semibold hover:bg-lime/90 transition-colors text-lg"
                    >
                        Join as a Creative
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                        </svg>
                    </a>
                    <p className="text-white/60 text-sm mt-4">
                        Early access for creatives • Limited spots available
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
