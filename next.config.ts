import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "wondarcdn.rootlex.dev",
                port: "",
            },
        ],
    },
};

export default nextConfig;
