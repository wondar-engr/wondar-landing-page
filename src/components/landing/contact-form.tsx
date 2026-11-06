"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { CheckCircle, ImagePlus, Loader2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";

const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-forest-green focus:outline-none text-slate";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Type = "BUG" | "FEATURE";
type Role = "CLIENT" | "CREATIVE";

// For people who can't get into the app to use the in-app bug report
export function ContactForm() {
    const submit = useMutation(api.lib.public.contact.mutations.submitReport);
    const getUploadUrl = useAction(api.r2.getReportImageUploadUrl);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [type, setType] = useState<Type>("BUG");
    const [role, setRole] = useState<Role>("CREATIVE");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [website, setWebsite] = useState(""); // honeypot, left empty by people
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        setError(null);
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files).slice(
                0,
                MAX_IMAGES - images.length,
            )) {
                if (!IMAGE_TYPES.includes(file.type)) {
                    setError("Please use PNG, JPG or WebP images.");
                    continue;
                }
                if (file.size > MAX_IMAGE_BYTES) {
                    setError("Each image must be under 5 MB.");
                    continue;
                }
                const { uploadUrl, key } = await getUploadUrl({
                    contentType: file.type,
                });
                const res = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });
                if (!res.ok) throw new Error("Upload failed");
                uploaded.push(
                    `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL}/${key}`,
                );
            }
            setImages(prev => [...prev, ...uploaded]);
        } catch {
            setError("We couldn't upload that image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        try {
            const res = await submit({
                name,
                email,
                type,
                role,
                title,
                message,
                screenshots: images.length ? images : undefined,
                website,
            });
            if (!res.success) {
                setError(
                    res.error ?? "Something went wrong. Please try again.",
                );
                return;
            }
            setDone(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (done) {
        return (
            <section className="pb-20 px-4">
                <div className="max-w-lg mx-auto bg-lime/20 rounded-3xl p-10 text-center">
                    <CheckCircle className="w-14 h-14 text-forest-green mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate mb-2">
                        Thanks, we got it
                    </h2>
                    <p className="text-slate/60">
                        Our team has your message and will follow up at{" "}
                        {email.trim()}.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="pb-20 px-4">
            <form
                onSubmit={handleSubmit}
                className="max-w-lg mx-auto bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-5"
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-slate/70 mb-1 block">
                            Your name
                        </label>
                        <input
                            className={inputClass}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate/70 mb-1 block">
                            Email
                        </label>
                        <input
                            className={inputClass}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate/70 mb-1 block">
                            What is this about?
                        </label>
                        <select
                            className={inputClass}
                            value={type}
                            onChange={e => setType(e.target.value as Type)}
                        >
                            <option value="BUG">
                                Something isn&apos;t working
                            </option>
                            <option value="FEATURE">
                                An idea or suggestion
                            </option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate/70 mb-1 block">
                            I use Wondar as a
                        </label>
                        <select
                            className={inputClass}
                            value={role}
                            onChange={e => setRole(e.target.value as Role)}
                        >
                            <option value="CREATIVE">Creative</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate/70 mb-1 block">
                        Short title
                    </label>
                    <input
                        className={inputClass}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={150}
                        placeholder="e.g. I can't log in"
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate/70 mb-1 block">
                        Tell us what happened
                    </label>
                    <textarea
                        className={inputClass}
                        rows={6}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        maxLength={4000}
                        placeholder="What did you do, what did you expect, and what happened instead?"
                        required
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate/70 mb-2 block">
                        Screenshots (optional, up to {MAX_IMAGES})
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {images.map(url => (
                            <div key={url} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt="Attached screenshot"
                                    className="w-20 h-20 rounded-xl border border-gray-200 object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setImages(prev =>
                                            prev.filter(u => u !== url),
                                        )
                                    }
                                    className="absolute -top-2 -right-2 bg-slate text-white rounded-full p-1"
                                    aria-label="Remove image"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {images.length < MAX_IMAGES && (
                            <label className="w-20 h-20 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-xs text-slate/60 cursor-pointer hover:bg-gray-50">
                                {uploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-5 h-5" />
                                        Add
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    multiple
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={e => {
                                        void handleFiles(e.target.files);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Hidden from people; bots tend to fill every field */}
                <div className="hidden" aria-hidden="true">
                    <label>
                        Website
                        <input
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                        />
                    </label>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    type="submit"
                    disabled={sending || uploading}
                    className="w-full py-4 bg-forest-green text-white rounded-full font-semibold hover:bg-forest-green/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {sending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        "Send to the Wondar team"
                    )}
                </button>
            </form>
        </section>
    );
}
