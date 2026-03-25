import { CheckCircle2, FileText, FileCheck } from "lucide-react";
import {
    getBNMStats,
    getPjumActivity,
    getPendingPjumCount,
} from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { PjumActivitySectionWide } from "./shared/activity-feed";
import {
    DashboardStats,
    type DashboardHeroStat,
    type DashboardStatItem,
} from "./shared/dashboard-stats";
import type { AuthUser } from "@/lib/authorization";

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities, pendingPjumCount] = await Promise.all([
        getBNMStats(user.branchNames),
        getPjumActivity(user.branchNames),
        getPendingPjumCount(user.branchNames),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "pending-pjum",
        label: "PJUM Menunggu Approval",
        description: "Dokumen PJUM yang perlu Anda setujui",
        value: pendingPjumCount,
        icon: FileCheck,
        href: "/reports/pjum",
        colorClass: "text-amber-600",
        heroColorClass: "bg-amber-500 text-white hover:bg-amber-600",
        heroTextColorClass: "text-amber-100",
        heroTrendColorClass: "text-amber-200",
    };

    const secondaryStats: DashboardStatItem[] = [
        {
            id: "completed",
            label: "Selesai",
            description: "Laporan yang sudah selesai",
            value: bnmStats.completed,
            icon: CheckCircle2,
            href: "/reports?status=completed",
            colorClass: "text-green-600",
        },
        {
            id: "total",
            label: "Total Laporan",
            description: "Semua laporan di branch",
            value: bnmStats.totalReports,
            icon: FileText,
            href: "/reports?status=view_all",
            colorClass: "text-blue-600",
        },
    ];

    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 gap-4 lg:gap-6 items-start">
                <div className="space-y-4">
                    {/* Stats Panel */}
                    <DashboardStats
                        hero={heroStat}
                        secondary={secondaryStats}
                        heroWidthClass="lg:w-100"
                    />

                    {/* Activity Feed — wide layout */}
                    <PjumActivitySectionWide
                        activities={activities}
                        emptyMessage="Aktivitas PJUM terbaru akan muncul di sini."
                    />
                </div>
            </div>
        </DashboardShell>
    );
}
