import { ClipboardCheck, CheckCircle2, FileText, FileCheck } from "lucide-react";
import { getBNMStats, getBranchActivity, getPendingPjumCount } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySectionWide } from "./shared/activity-feed";
import {
    DashboardStats,
    type DashboardHeroStat,
    type DashboardStatItem,
} from "./shared/dashboard-stats";
import type { AuthUser } from "@/lib/authorization";

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities, pendingPjumCount] = await Promise.all([
        getBNMStats(user.branchNames),
        getBranchActivity(user.branchNames),
        getPendingPjumCount(user.branchNames),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "pending-review",
        label: "Menunggu Review",
        description: "Laporan menunggu review penyelesaian dari Anda",
        value: bnmStats.pendingReview,
        icon: ClipboardCheck,
        href: "/reports?status=pending_review",
        colorClass: "text-purple-600",
        heroColorClass: "bg-purple-500 text-white hover:bg-purple-600",
        heroTextColorClass: "text-purple-100",
        heroTrendColorClass: "text-purple-200",
    };

    const secondaryStats: DashboardStatItem[] = [
        {
            id: "pending-pjum",
            label: "PJUM Menunggu Approval",
            description: "PJUM yang perlu Anda setujui",
            value: pendingPjumCount,
            icon: FileCheck,
            href: "/reports/pjum/approval",
            colorClass: "text-amber-600",
        },
        {
            id: "completed",
            label: "Selesai",
            description: "Telah disetujui",
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
                    />

                    {/* Activity Feed — wide layout */}
                    <ActivitySectionWide
                        activities={activities}
                        emptyMessage="Aktivitas laporan cabang akan muncul di sini."
                    />
                </div>
            </div>
        </DashboardShell>
    );
}
