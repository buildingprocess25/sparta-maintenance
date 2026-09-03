"use client";

import Link from "next/link";
import { PlusCircle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
    formatBmsActiveReportBlockerMessage,
    type BmsActiveReportBlockerSummary,
} from "@/lib/bms-active-report-blocker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BmsCreateReportButtonProps = {
    blocker: BmsActiveReportBlockerSummary | null;
    className?: string;
    label?: string;
    mobileLabel?: string;
    icon?: LucideIcon;
    size?: "default" | "sm" | "lg";
};

export function BmsCreateReportButton({
    blocker,
    className,
    label = "Buat Laporan",
    mobileLabel = "Laporan Baru",
    icon: Icon = PlusCircle,
    size = "default",
}: BmsCreateReportButtonProps) {
    if (!blocker) {
        return (
            <Button asChild size={size} className={className}>
                <Link href="/reports/create">
                    <Icon data-icon="inline-start" />
                    <span className="hidden md:inline">{label}</span>
                    <span className="md:hidden">{mobileLabel}</span>
                </Link>
            </Button>
        );
    }

    return (
        <Button
            type="button"
            size={size}
            variant="outline"
            className={cn(
                "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900",
                className,
            )}
            onClick={() => {
                toast.warning("Laporan aktif belum selesai", {
                    description: formatBmsActiveReportBlockerMessage(blocker),
                    action: {
                        label: "Lihat",
                        onClick: () => {
                            window.location.href = `/reports/${blocker.reportNumber}`;
                        },
                    },
                });
            }}
        >
            <Icon data-icon="inline-start" />
            <span className="hidden md:inline">{label}</span>
            <span className="md:hidden">{mobileLabel}</span>
        </Button>
    );
}
