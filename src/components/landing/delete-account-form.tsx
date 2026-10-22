"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, CheckCircle } from "lucide-react";

const schema = z.object({ email: z.email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export function DeleteAccountForm() {
    const [done, setDone] = useState<null | { already: boolean }>(null);
    const request = useMutation(api.lib.public.deletion.mutations.request);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async ({ email }: FormData) => {
        if (!email) return;
        const res = await request({ email });

        if (res.error) {
            alert(res.error);
            return;
        }
        setDone({ already: res.alreadyRequested });
    };

    return (
        <section className="pb-12 px-4">
            <div className="max-w-lg mx-auto">
                {done ? (
                    <div className="bg-lime/20 rounded-3xl p-10 text-center">
                        <CheckCircle className="w-14 h-14 text-forest-green mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate mb-2">
                            {done.already
                                ? "Request already received"
                                : "Request received"}
                        </h2>
                        <p className="text-slate/60">
                            Check your inbox for a confirmation. We&apos;ll
                            verify the request and delete your data within 30
                            days.
                        </p>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-5"
                    >
                        <div>
                            <label className="text-sm font-medium text-slate/70 mb-1 block">
                                Account email
                            </label>
                            <input
                                {...register("email")}
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
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-forest-green text-white rounded-full font-semibold hover:bg-forest-green/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />{" "}
                                    Submitting...
                                </>
                            ) : (
                                "Request deletion"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}
