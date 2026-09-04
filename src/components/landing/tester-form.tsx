"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";

const schema = z.object({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.email("Enter a valid email"),
    phone: z
        .string()
        .min(7, "Enter a valid WhatsApp number")
        .regex(
            /^\+?[1-9]\d{6,14}$/,
            "Enter a valid WhatsApp number with country code",
        ),
    city: z.string().min(1, "Required"),
    primaryRole: z.enum(["CLIENT", "CREATIVE"], {
        error: "Please select a role",
    }),
    deviceOs: z.enum(["IOS", "ANDROID", "BOTH"], {
        error: "Please select your device",
    }),
});

type FormData = z.infer<typeof schema>;

export function TesterForm() {
    const [submitted, setSubmitted] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const register = useMutation(api.lib.testers.mutations.register);

    const {
        register: field,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        const result = await register(data);
        setAlreadyRegistered(result.alreadyRegistered);
        setSubmitted(true);
    };

    return (
        <section className="pb-24 px-4">
            <div className="max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {submitted ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-lime/20 rounded-3xl p-10 text-center"
                        >
                            <CheckCircle className="w-14 h-14 text-forest-green mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-slate mb-2">
                                {alreadyRegistered
                                    ? "You're already registered!"
                                    : "You're in! 🎉"}
                            </h2>
                            <p className="text-slate/60">
                                {alreadyRegistered
                                    ? "We already have your details. We'll be in touch soon."
                                    : "We'll reach out with next steps and app access details."}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onSubmit={handleSubmit(onSubmit)}
                            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-5"
                        >
                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate/70 mb-1 block">
                                        First name
                                    </label>
                                    <input
                                        {...field("firstName")}
                                        placeholder="Ada"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate"
                                    />
                                    {errors.firstName && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.firstName.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate/70 mb-1 block">
                                        Last name
                                    </label>
                                    <input
                                        {...field("lastName")}
                                        placeholder="Obi"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate"
                                    />
                                    {errors.lastName && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.lastName.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-sm font-medium text-slate/70 mb-1 block">
                                    Email
                                </label>
                                <input
                                    {...field("email")}
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate"
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="text-sm font-medium text-slate/70 mb-1 block">
                                    WhatsApp Number{" "}
                                </label>
                                <input
                                    {...field("phone")}
                                    type="tel"
                                    placeholder="+1 234 567 8900"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate"
                                />
                                {errors.phone && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.phone.message}
                                    </p>
                                )}
                            </div>

                            {/* City */}
                            <div>
                                <label className="text-sm font-medium text-slate/70 mb-1 block">
                                    City
                                </label>
                                <input
                                    {...field("city")}
                                    placeholder="Atlanta, GA"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate"
                                />
                                {errors.city && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.city.message}
                                    </p>
                                )}
                            </div>

                            {/* Primary Role */}
                            <div>
                                <label className="text-sm font-medium text-slate/70 mb-3 block">
                                    I primarily want to...
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["CLIENT", "CREATIVE"] as const).map(
                                        role => (
                                            <label
                                                key={role}
                                                className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 cursor-pointer has-checked:border-forest-green has-checked:bg-lime/10 transition-all"
                                            >
                                                <input
                                                    {...field("primaryRole")}
                                                    type="radio"
                                                    value={role}
                                                    className="sr-only"
                                                />
                                                <span className="text-2xl">
                                                    {role === "CLIENT"
                                                        ? "🛒"
                                                        : "✂️"}
                                                </span>
                                                <span className="text-sm font-semibold text-slate">
                                                    {role === "CLIENT"
                                                        ? "Book services"
                                                        : "Offer services"}
                                                </span>
                                                <span className="text-xs text-slate/50 text-center">
                                                    {role === "CLIENT"
                                                        ? "I'm a client looking for creatives"
                                                        : "I'm a creative offering my skills"}
                                                </span>
                                            </label>
                                        ),
                                    )}
                                </div>
                                {errors.primaryRole && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.primaryRole.message}
                                    </p>
                                )}
                            </div>

                            {/* Device OS */}
                            <div>
                                <label className="text-sm font-medium text-slate/70 mb-3 block">
                                    What device will you test on?
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["IOS", "ANDROID", "BOTH"] as const).map(
                                        os => (
                                            <label
                                                key={os}
                                                className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 cursor-pointer has-checked:border-forest-green has-checked:bg-lime/10 transition-all"
                                            >
                                                <input
                                                    {...field("deviceOs")}
                                                    type="radio"
                                                    value={os}
                                                    className="sr-only"
                                                />
                                                <span className="text-2xl">
                                                    {os === "IOS"
                                                        ? "🍎"
                                                        : os === "ANDROID"
                                                          ? "🤖"
                                                          : "📱"}
                                                </span>
                                                <span className="text-sm font-semibold text-slate">
                                                    {os === "IOS"
                                                        ? "iPhone"
                                                        : os === "ANDROID"
                                                          ? "Android"
                                                          : "Both"}
                                                </span>
                                            </label>
                                        ),
                                    )}
                                </div>
                                {errors.deviceOs && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.deviceOs.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-forest-green text-white rounded-full font-semibold hover:bg-forest-green/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Sign me up"
                                )}
                            </button>

                            <p className="text-xs text-slate/40 text-center">
                                You can use both roles — just pick your primary
                                one.
                            </p>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
