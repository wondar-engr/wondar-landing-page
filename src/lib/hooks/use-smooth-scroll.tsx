"use client";

import { useEffect } from "react";

export function useSmoothScroll() {
    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a[href^="#"]');

            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;

            e.preventDefault();

            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerOffset = 80; // Account for fixed header
                const elementPosition =
                    targetElement.getBoundingClientRect().top;
                const offsetPosition =
                    elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });

                // Update URL without triggering navigation
                window.history.pushState(null, "", href);
            }
        };

        document.addEventListener("click", handleAnchorClick);

        return () => {
            document.removeEventListener("click", handleAnchorClick);
        };
    }, []);
}

export function SmoothScrollProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    useSmoothScroll();
    return <>{children}</>;
}
