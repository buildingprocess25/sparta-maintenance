import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
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
    async headers() {
        return [
            {
                source: "/sw.js",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/javascript; charset=utf-8",
                    },
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
