import { Funnel_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import NextTopLoader from "nextjs-toploader";

const funnelSans = Funnel_Sans({
    variable: "--font-funnel-sans",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${funnelSans.variable}  antialiased`}>
                <NextTopLoader color="#2D5A3D" />
                <ConvexClientProvider>{children}</ConvexClientProvider>
            </body>
        </html>
    );
}
