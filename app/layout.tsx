import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionInterceptor } from "@/components/session-interceptor";

import { SessionExpiryAlert } from "@/components/session-expiry-alert";
import { PWARegister } from "@/components/pwa-register";
import { PresenceTracker } from "@/components/presence-tracker";
import { RouteProgress } from "@/components/route-progress";

const geistSans = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export const metadata: Metadata = {
    title: "SPARTA Maintenance | Pusat Pelaporan Pekerjaan Maintenance Toko",
    description:
        "Aplikasi pelaporan kerusakan, monitoring progres perbaikan, dan tracking aset maintenance toko secara terpusat.",
    manifest: "/manifest.webmanifest",
    other: {
        google: "notranslate",
    },
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
        <html
            lang="id"
            translate="no"
            className={`${geistSans.variable} ${geistMono.variable} notranslate`}
        >
            <body
                className={`${geistSans.className} antialiased notranslate`}
                translate="no"
            >
                <PWARegister />
                <PresenceTracker />
                <Suspense fallback={null}>
                    <RouteProgress />
                </Suspense>
                <SessionInterceptor>{children}</SessionInterceptor>
                <SessionExpiryAlert />
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
