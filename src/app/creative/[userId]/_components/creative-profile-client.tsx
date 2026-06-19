"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Star, Clock, ChevronRight, Download } from "lucide-react";
import { AppStoreModal } from "./app-store-modal";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────

interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
    image?: string;
}

interface Profile {
    userId: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    businessName: string;
    aboutMe?: string;
    coverImage?: string;
    location: { city: string; state: string };
    stats?: {
        averageRating: number;
        totalReviews: number;
        completedBookings: number;
    };
    services: Service[];
}

interface Props {
    profile: Profile;
    userId: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function getPlatform() {
    if (typeof navigator === "undefined") return "desktop";
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "desktop";
}

// ── Component ─────────────────────────────────────────────────────

export function CreativeProfileClient({ profile, userId }: Props) {
    const deepLink = `wondarapp://creative/${userId}`;
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [showStoreModal, setShowStoreModal] = useState(false);

    const displayName = `${profile.firstName} ${profile.lastName}`.trim();

    // Auto-trigger deep link on mobile on mount
    useEffect(() => {
        const platform = getPlatform();
        if (platform === "desktop") return;

        const timer = setTimeout(() => {
            window.location.href = deepLink;
        }, 800);

        return () => clearTimeout(timer);
    }, [deepLink]);

    const handleOpenApp = () => {
        const platform = getPlatform();

        if (platform === "desktop") {
            setShowStoreModal(true);
            return;
        }

        // Mobile — try deep link first, fall back to store
        window.location.href = deepLink;

        // DEV: Replace store URLs with real links once app is published
        setTimeout(() => {
            if (platform === "ios") {
                window.location.href = "https://apps.apple.com/app/wondar"; // DEV: Add App Store ID
            } else {
                window.location.href =
                    "https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew"; // DEV: Confirm Play Store slug
            }
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── App Store Modal ───────────────────────────────── */}
            <AppStoreModal
                isOpen={showStoreModal}
                onClose={() => setShowStoreModal(false)}
                creativeName={profile.firstName}
            />

            {/* ── Open in App Banner ────────────────────────────── */}
            {!bannerDismissed && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                    <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                        {/* Logo */}
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/images/logo.png"
                                alt="Wondar"
                                width={120}
                                height={32}
                                className="h-12 w-auto object-contain"
                                priority
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate">
                                Open in Wondar
                            </p>
                            <p className="text-xs text-slate/60 truncate">
                                Better experience in the app
                            </p>
                        </div>
                        <button
                            onClick={handleOpenApp}
                            className="shrink-0 bg-forest-green text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-forest-green/90 transition-colors"
                        >
                            Open
                        </button>
                        <button
                            onClick={() => setBannerDismissed(true)}
                            className="shrink-0 text-slate/40 hover:text-slate/60 text-xl leading-none pb-0.5"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* ── Page Content ─────────────────────────────────── */}
            <div
                className={`max-w-lg mx-auto pb-32 ${
                    !bannerDismissed ? "pt-16" : ""
                }`}
            >
                {/* Cover Image */}
                <div className="relative h-52 bg-forest-green/20">
                    {profile.coverImage && (
                        <Image
                            src={profile.coverImage}
                            alt={profile.businessName}
                            fill
                            className="object-cover"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                </div>

                {/* Profile Info */}
                <div className="bg-white px-5 pb-5 relative">
                    <div className="flex items-end justify-between -mt-10 mb-4">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl border-4 border-white bg-gray-100 overflow-hidden shadow-md">
                            {profile.avatar ? (
                                <Image
                                    src={profile.avatar}
                                    alt={displayName}
                                    width={80}
                                    height={80}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-forest-green/20 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-forest-green">
                                        {profile.firstName?.[0]}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Rating */}
                        {profile.stats && profile.stats.totalReviews > 0 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-semibold text-amber-700">
                                    {profile.stats.averageRating.toFixed(1)}
                                </span>
                                <span className="text-xs text-amber-600">
                                    ({profile.stats.totalReviews})
                                </span>
                            </div>
                        )}
                    </div>

                    <h1 className="text-xl font-bold text-slate">
                        {profile.businessName}
                    </h1>
                    <p className="text-sm text-slate/60 mb-1">{displayName}</p>

                    <div className="flex items-center gap-1 text-slate/50 text-sm mb-4">
                        <MapPin className="w-4 h-4" />
                        <span>
                            {profile.location.city}, {profile.location.state}
                        </span>
                    </div>

                    {/* Stats Row */}
                    {profile.stats && (
                        <div className="flex gap-4 py-3 border-t border-gray-50">
                            <div className="text-center flex-1">
                                <p className="text-lg font-bold text-slate">
                                    {profile.stats.completedBookings}
                                </p>
                                <p className="text-xs text-slate/50">
                                    Bookings
                                </p>
                            </div>
                            <div className="w-px bg-gray-100" />
                            <div className="text-center flex-1">
                                <p className="text-lg font-bold text-slate">
                                    {profile.stats.totalReviews}
                                </p>
                                <p className="text-xs text-slate/50">Reviews</p>
                            </div>
                            <div className="w-px bg-gray-100" />
                            <div className="text-center flex-1">
                                <p className="text-lg font-bold text-slate">
                                    {profile.stats.averageRating.toFixed(1)}
                                </p>
                                <p className="text-xs text-slate/50">Rating</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* About */}
                {profile.aboutMe && (
                    <div className="bg-white mt-3 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate/50 uppercase tracking-wide mb-2">
                            About
                        </h2>
                        <p className="text-slate/80 text-sm leading-relaxed">
                            {profile.aboutMe}
                        </p>
                    </div>
                )}

                {/* Services */}
                {profile.services.length > 0 && (
                    <div className="bg-white mt-3 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate/50 uppercase tracking-wide mb-4">
                            Services
                        </h2>
                        <div className="space-y-1">
                            {profile.services.map((service, i) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate">
                                            {service.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Clock className="w-3 h-3 text-slate/40" />
                                            <span className="text-xs text-slate/50">
                                                {service.duration} min
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-forest-green">
                                            ${(service.price / 100).toFixed(0)}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate/30" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sticky CTA Footer ─────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 shadow-lg z-30">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleOpenApp}
                        className="w-full bg-forest-green text-white py-4 rounded-2xl font-semibold text-base hover:bg-forest-green/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Book {profile.firstName} on Wondar
                    </button>
                    <p className="text-center text-xs text-slate/40 mt-2">
                        Free to download · Available on iOS & Android
                    </p>
                </div>
            </div>
        </div>
    );
}
