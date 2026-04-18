"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Calendar, Shield, Star } from "lucide-react";

const features = [
    {
        icon: MapPin,
        title: "Discover Nearby Creatives",
        description:
            "Find talented hairstylists, makeup artists, photographers, and more right in your neighborhood.",
        color: "bg-emerald-100 text-emerald-600",
    },
    {
        icon: Calendar,
        title: "Book Instantly",
        description:
            "See real-time availability and book appointments that fit your schedule. No back-and-forth needed.",
        color: "bg-lime-100 text-lime-600",
    },
    {
        icon: Shield,
        title: "Secure Payments",
        description:
            "Pay safely through the app with buyer protection. Your payment is held until the service is complete.",
        color: "bg-blue-100 text-blue-600",
    },
    {
        icon: Star,
        title: "Real Reviews",
        description:
            "Make informed decisions with verified reviews from real customers who've used the service.",
        color: "bg-amber-100 text-amber-600",
    },
];

export function Features() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="features" className="py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate mb-4">
                        Everything you need to{" "}
                        <span className="text-forest-green">
                            book with confidence
                        </span>
                    </h2>
                    <p className="text-lg text-slate/70 max-w-2xl mx-auto">
                        Wondar makes it easy to find, book, and pay for creative
                        services—all in one place.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div
                                className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}
                            >
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-slate/60 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
