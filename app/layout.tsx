import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionInterceptor } from "@/components/session-interceptor";

import { SessionExpiryAlert } from "@/components/session-expiry-alert";
import { PWARegister } from "@/components/pwa-register";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "SPARTA Maintenance | Pusat Pelaporan Pekerjaan Maintenance Toko",
    description:
        "Aplikasi pelaporan kerusakan, monitoring progres perbaikan, dan tracking aset maintenance toko secara terpusat.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "SPARTA",
    },
};

export const viewport: Viewport = {
    themeColor: "#111827",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={outfit.variable}>
            <body className="antialiased">
                <PWARegister />
                <SessionInterceptor>{children}</SessionInterceptor>
                <SessionExpiryAlert />
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
