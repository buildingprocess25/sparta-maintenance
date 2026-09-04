"use client";

import { useState } from "react";
import { Images, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ReportFullPdfButton({
    reportNumber,
    initialUrl,
    isReady,
    label,
}: {
    reportNumber: string;
    initialUrl: string;
    isReady: boolean;
    label: string;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handlePrepare = async () => {
        setIsLoading(true);
        try {
            // Trigger the API endpoint to generate and save to Drive
            const res = await fetch(`/api/reports/${encodeURIComponent(reportNumber)}/pdf-full`);
            if (res.ok || res.redirected) {
                // Refresh the page so the server component gets the new fullPdfDriveUrl
                toast.success("Laporan Lengkap PDF berhasil disiapkan!");
                router.refresh();
            } else {
                toast.error("Gagal menyiapkan PDF");
            }
        } catch (error) {
            console.error("Failed to prepare full PDF:", error);
            toast.error("Gagal menyiapkan PDF, terjadi kesalahan");
        } finally {
            setIsLoading(false);
        }
    };

    if (isReady) {
        return (
            <Button
                asChild
                variant="outline"
                className="border-teal-500 bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:border-teal-500/50 dark:text-teal-400"
                size="sm"
            >
                <Link href={initialUrl} target="_blank" rel="noopener noreferrer">
                    <Images data-icon="inline-start" />
                    {label}
                </Link>
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            className="border-teal-500 bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:border-teal-500/50 dark:text-teal-400"
            size="sm"
            onClick={handlePrepare}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
                <Images data-icon="inline-start" />
            )}
            {isLoading ? "Menyiapkan PDF..." : label}
        </Button>
    );
}