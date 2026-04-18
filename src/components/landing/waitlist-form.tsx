"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import confetti from "canvas-confetti";
import { Loader2, CheckCircle, Copy, Check } from "lucide-react";

const waitlistSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    firstName: z.string().optional(),
    interestedAs: z.enum(["CLIENT", "CREATIVE", "BOTH"]).optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export function WaitlistForm() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [result, setResult] = useState<{
        position: number;
        referralCode: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const joinWaitlist = useMutation(api.lib.waitlist.core.join);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<WaitlistFormData>({
        resolver: zodResolver(waitlistSchema),
    });

    const onSubmit = async (data: WaitlistFormData) => {
        try {
            const response = await joinWaitlist({
                email: data.email,
                firstName: data.firstName,
                interestedAs: data.interestedAs,
            });

            if (response.success) {
                setResult({
                    position: response.position!,
                    referralCode: response.referralCode!,
                });
                setIsSubmitted(true);

                // Trigger confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ["#2D5A3D", "#E4F97C", "#5BD300"],
                });
            } else if (response.error === "already_exists") {
                setResult({
                    position: response.position!,
                    referralCode: response.referralCode!,
                });
                setIsSubmitted(true);
            }
        } catch (error) {
            console.error("Failed to join waitlist:", error);
        }
    };

    const copyReferralLink = () => {
        const link = `https://wondarapp.com?ref=${result?.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence mode="wait">
            {!isSubmitted ? (
                <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                {...register("email")}
                                type="email"
                                placeholder="Enter your email"
                                className="w-full px-5 py-4 rounded-full border-2 border-gray-200 focus:border-forest-green focus:outline-none transition-colors text-slate"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1 ml-4">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-4 bg-forest-green text-white rounded-full font-semibold hover:bg-forest-green/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                "Join Waitlist"
                            )}
                        </motion.button>
                    </div>

                    {/* Optional: Interest Selection */}
                    <div className="flex items-center justify-center lg:justify-start gap-4 text-sm">
                        <span className="text-slate/60">I want to:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                {...register("interestedAs")}
                                type="radio"
                                value="CLIENT"
                                className="accent-forest-green"
                            />
                            <span className="text-slate/80">Book services</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                {...register("interestedAs")}
                                type="radio"
                                value="CREATIVE"
                                className="accent-forest-green"
                            />
                            <span className="text-slate/80">
                                Offer services
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                {...register("interestedAs")}
                                type="radio"
                                value="BOTH"
                                className="accent-forest-green"
                            />
                            <span className="text-slate/80">Both</span>
                        </label>
                    </div>
                </motion.form>
            ) : (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-lime/20 rounded-3xl p-6 text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                    >
                        <CheckCircle className="w-16 h-16 text-forest-green mx-auto mb-4" />
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate mb-2">
                        You&apos;re on the list! 🎉
                    </h3>

                    <p className="text-slate/70 mb-4">
                        You&apos;re{" "}
                        <span className="font-bold text-forest-green">
                            #{result?.position}
                        </span>{" "}
                        in line. We&apos;ll notify you when it&apos;s your turn.
                    </p>

                    <div className="bg-white rounded-2xl p-4 mb-4">
                        <p className="text-sm text-slate/60 mb-2">
                            Share & skip the line
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-50 px-4 py-2 rounded-lg text-forest-green font-mono text-sm">
                                {result?.referralCode}
                            </code>
                            <button
                                onClick={copyReferralLink}
                                className="p-2 bg-forest-green text-white rounded-lg hover:bg-forest-green/90 transition-colors"
                            >
                                {copied ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-slate/50">
                        Move up 5 spots for every friend who joins!
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
