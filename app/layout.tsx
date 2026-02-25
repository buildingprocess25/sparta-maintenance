import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionInterceptor } from "@/components/session-interceptor";

import { SessionExpiryAlert } from "@/components/session-expiry-alert";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "SPARTA Maintenance | Sistem Manajemen Pemeliharaan",
    description:
        "Platform terpusat untuk pelaporan kerusakan, monitoring perbaikan, dan pengelolaan SPJ maintenance di seluruh store",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={outfit.variable}>
            <body className="antialiased">
                <SessionInterceptor>{children}</SessionInterceptor>
                <SessionExpiryAlert />
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
