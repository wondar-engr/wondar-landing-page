import { Footer, Header } from "@/components/global";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Wondar - Book Creative Services On-Demand",
    description:
        "Connect with talented creatives for hair, makeup, photography & more. Book instantly, pay securely.",
    openGraph: {
        title: "Wondar - Book Creative Services On-Demand",
        description:
            "Connect with talented creatives for hair, makeup, photography & more.",
        images: ["/og-image.png"],
    },
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
