import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionInterceptor } from "@/components/session-interceptor";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <SessionInterceptor>{children}</SessionInterceptor>
                <Toaster />
            </body>
        </html>
    );
}
