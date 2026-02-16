import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: [
                "localhost:3000",
                "*.devtunnels.ms",
                "*.devtunnels.ms:*",
                "*.ngrok-free.dev",
                "*.ngrok-free.dev:*",
            ],
        },
    },
};

export default nextConfig;
