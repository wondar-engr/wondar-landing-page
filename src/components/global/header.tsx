"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = useCallback((sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition =
                elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
        }
    }, []);

    // Handle navigation - works both on home page and other pages
    const handleNavClick = (
        e: React.MouseEvent<HTMLAnchorElement>,
        sectionId: string,
    ) => {
        e.preventDefault();

        // Close mobile menu first
        setIsMobileMenuOpen(false);

        if (pathname === "/") {
            // Already on home page - just scroll after a small delay for menu to close
            setTimeout(() => {
                scrollToSection(sectionId);
            }, 100);
        } else {
            // On another page - navigate home with hash
            router.push(`/#${sectionId}`);
        }
    };

    // Handle hash on page load (when navigating from another page)
    useEffect(() => {
        if (pathname === "/" && window.location.hash) {
            const sectionId = window.location.hash.replace("#", "");
            // Delay to ensure page is fully loaded
            const timer = setTimeout(() => {
                scrollToSection(sectionId);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pathname, scrollToSection]);

    const navLinks = [
        { href: "/#features", id: "features", label: "Features" },
        { href: "/#how-it-works", id: "how-it-works", label: "How It Works" },
        { href: "/#creatives", id: "creatives", label: "For Creatives" },
    ];

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled
                    ? "bg-white/90 backdrop-blur-md shadow-sm"
                    : "bg-transparent"
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo-wide.png"
                            alt="Wondar"
                            width={120}
                            height={32}
                            className="h-8 w-auto object-contain"
                            priority
                        />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map(link => (
                            <Link
                                key={link.id}
                                href={link.href}
                                onClick={e => handleNavClick(e, link.id)}
                                className="text-slate/70 hover:text-slate transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA Button */}
                    <div className="hidden md:block">
                        <Link
                            href="/#waitlist"
                            onClick={e => handleNavClick(e, "waitlist")}
                            className="bg-forest-green text-white px-6 py-2.5 rounded-full font-medium hover:bg-forest-green/90 transition-colors"
                        >
                            Join Waitlist
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-slate" />
                        ) : (
                            <Menu className="w-6 h-6 text-slate" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-white border-t overflow-hidden"
                    >
                        <nav className="flex flex-col p-4 gap-2">
                            {navLinks.map(link => (
                                <button
                                    key={link.id}
                                    onClick={e => {
                                        e.preventDefault();
                                        setIsMobileMenuOpen(false);
                                        setTimeout(() => {
                                            if (pathname === "/") {
                                                scrollToSection(link.id);
                                            } else {
                                                router.push(`/#${link.id}`);
                                            }
                                        }, 150);
                                    }}
                                    className="text-slate/70 hover:text-slate py-3 text-left"
                                >
                                    {link.label}
                                </button>
                            ))}
                            <button
                                onClick={e => {
                                    e.preventDefault();
                                    setIsMobileMenuOpen(false);
                                    setTimeout(() => {
                                        if (pathname === "/") {
                                            scrollToSection("waitlist");
                                        } else {
                                            router.push("/#waitlist");
                                        }
                                    }, 150);
                                }}
                                className="bg-forest-green text-white px-6 py-3 rounded-full font-medium text-center mt-2"
                            >
                                Join Waitlist
                            </button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
