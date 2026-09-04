"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export function BetaTesters() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-24 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="bg-forest-green rounded-3xl px-10 py-14 text-center relative overflow-hidden"
                >
                    {/* Background pattern */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 20.5V18H0v5h5v5H0v5h20v-5h-5v-5h5v-5zM20 0H0v5h5v5H0v5h20V5h-5V0h5V0z'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    />

                    <div className="relative">
                        <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 bg-lime/20 text-lime px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
                            </span>
                            Limited spots available
                        </motion.span>

                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Be the first to use Wondar
                        </h2>

                        <p className="text-white/70 text-lg max-w-xl mx-auto mb-4">
                            We&apos;re looking for real people — clients and
                            creatives — to test the app before launch. Your
                            feedback shapes what we ship.
                        </p>

                        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60 mb-10">
                            <span className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 text-lime"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Free early access
                            </span>
                            <span className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 text-lime"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                iOS & Android
                            </span>
                            <span className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 text-lime"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Shape the product
                            </span>
                        </div>

                        <Link
                            href="/testers"
                            className="inline-flex items-center gap-2 bg-lime text-forest-green px-8 py-4 rounded-full font-bold text-lg hover:bg-lime/90 transition-colors"
                        >
                            Apply to be a tester
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
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
