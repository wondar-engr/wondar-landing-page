"use client";

import { useState, useEffect } from "react";
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

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition =
                elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
        }
    };

    // Handle navigation - works both on home page and other pages
    const handleNavClick = (
        e: React.MouseEvent<HTMLAnchorElement>,
        sectionId: string,
    ) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);

        if (pathname === "/") {
            // Already on home page - just scroll
            scrollToSection(sectionId);
        } else {
            // On another page - navigate home first, then scroll
            router.push(`/#${sectionId}`);
        }
    };

    // Handle hash on page load (when navigating from another page)
    useEffect(() => {
        if (pathname === "/" && window.location.hash) {
            const sectionId = window.location.hash.replace("#", "");
            // Small delay to ensure page is loaded
            setTimeout(() => {
                scrollToSection(sectionId);
            }, 100);
        }
    }, [pathname]);

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
                        className="md:hidden bg-white border-t"
                    >
                        <nav className="flex flex-col p-4 gap-4">
                            {navLinks.map(link => (
                                <Link
                                    key={link.id}
                                    href={link.href}
                                    onClick={e => handleNavClick(e, link.id)}
                                    className="text-slate/70 hover:text-slate py-2"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <Link
                                href="/#waitlist"
                                onClick={e => handleNavClick(e, "waitlist")}
                                className="bg-forest-green text-white px-6 py-3 rounded-full font-medium text-center"
                            >
                                Join Waitlist
                            </Link>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
