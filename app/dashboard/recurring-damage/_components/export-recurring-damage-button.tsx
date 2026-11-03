"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RecurringDamageFilters } from "@/lib/recurring-damage";

function getFileNameFromDisposition(disposition: string | null) {
    if (!disposition) return null;

    const match = /filename="([^"]+)"/.exec(disposition);
    return match?.[1] ?? null;
}

export function ExportRecurringDamageButton({
    filters,
}: {
    filters: RecurringDamageFilters;
}) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const toastId = toast.loading("Menyiapkan file kerusakan berulang...");

        try {
            const res = await fetch("/api/dashboard/recurring-damage/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Gagal mengekspor kerusakan berulang");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                getFileNameFromDisposition(res.headers.get("Content-Disposition")) ??
                "Kerusakan_Berulang.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File kerusakan berulang berhasil diunduh", { id: toastId });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Gagal mengekspor kerusakan berulang";
            toast.error(message, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
                <Download data-icon="inline-start" />
            )}
            Ekspor XLSX
        </Button>
    );
}
