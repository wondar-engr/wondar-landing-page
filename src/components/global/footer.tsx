"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    FaInstagram as Instagram,
    FaYoutube as Youtube,
    FaFacebook as Facebook,
} from "react-icons/fa";

export function Footer() {
    return (
        <footer className="bg-slate py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Logo & Tagline */}
                    <div className="text-center md:text-left">
                        <Link
                            href="/"
                            className="flex items-center gap-2 justify-center md:justify-start mb-3"
                        >
                            <Image
                                src="/images/logo-wide.png"
                                alt="Wondar"
                                width={100}
                                height={28}
                                className="h-7 w-auto object-contain brightness-0 invert"
                            />
                        </Link>
                        <p className="text-white/60 text-sm">
                            Connecting clients with creative professionals
                        </p>
                    </div>

                    {/* Coming Soon Badge */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-2 bg-lime/20 text-lime px-4 py-2 rounded-full"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
                        </span>
                        <span className="text-sm font-medium">Coming Soon</span>
                    </motion.div>

                    {/* Social Links */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://www.instagram.com/wondarappofficial"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                        <a
                            href="https://www.youtube.com/@WondarApp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <Youtube className="w-5 h-5" />
                        </a>
                        <a
                            href="https://www.facebook.com/WondarApp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <Facebook className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <hr className="border-white/10 my-8" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/50">
                    <p>
                        © {new Date().getFullYear()} Wondar. All rights
                        reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/privacy"
                            className="hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="hover:text-white transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
