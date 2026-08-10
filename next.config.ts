import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["googleapis"],
  // Opsi allowedDevOrigins untuk Next.js 14.2+ (di luar experimental)
  // Masukkan domain ngrok spesifik atau wildcard tanpa protokol (http/https)
  allowedDevOrigins: ["localhost:3000", "*.devtunnels.ms", "*.ngrok-free.dev", "runtgenographically-preposterous-shanel.ngrok-free.dev"],
  experimental: {
    middlewareClientMaxBodySize: "70mb",
    serverActions: {
      bodySizeLimit: "70mb",
      allowedOrigins: ["localhost:3000", "*.devtunnels.ms", "*.devtunnels.ms:*", "*.ngrok-free.dev", "*.ngrok-free.dev:*", "runtgenographically-preposterous-shanel.ngrok-free.dev"],
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
