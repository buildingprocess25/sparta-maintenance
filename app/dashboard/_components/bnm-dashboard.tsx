import { CheckCircle2, FileText, FileCheck } from "lucide-react";
import { getBNMStats, getPjumActivity, getPendingPjumCount } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { PjumActivitySectionWide } from "./shared/activity-feed";
import {
    DashboardStats,
    type DashboardHeroStat,
    type DashboardStatItem,
} from "./shared/dashboard-stats";
import {
    DashboardMenus,
    type DashboardMenuItem,
} from "./shared/dashboard-menus";
import { Key } from "lucide-react";
import type { AuthUser } from "@/lib/authorization";

const MENUS: DashboardMenuItem[] = [
    {
        title: "Ganti Password",
        description: "Perbarui password akun Anda",
        icon: Key,
        action: "change-password",
        variant: "outline",
    },
];

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities, pendingPjumCount] = await Promise.all([
        getBNMStats(user.branchNames),
        getPjumActivity(user.branchNames),
        getPendingPjumCount(user.branchNames),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "pending-final-approval",
        label: "Review Final Laporan",
        description: "Laporan menunggu persetujuan final Anda",
        value: bnmStats.pendingFinalApproval,
        icon: FileCheck,
        href: "/reports",
        colorClass: "text-cyan-600",
        heroColorClass: "bg-cyan-500 text-white hover:bg-cyan-600",
        heroTextColorClass: "text-cyan-100",
        heroTrendColorClass: "text-cyan-200",
    };

    const secondaryStats: DashboardStatItem[] = [
        {
            id: "pending-pjum",
            label: "PJUM Menunggu Approval",
            description: "Dokumen PJUM yang perlu disetujui",
            value: pendingPjumCount,
            icon: FileCheck,
            href: "/reports/pjum",
            colorClass: "text-amber-600",
        },
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
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                <DashboardMenus menus={MENUS} />
                <div className="space-y-4">
                    {/* Stats Panel */}
                    <DashboardStats
                        hero={heroStat}
                        secondary={secondaryStats}
                        heroWidthClass="lg:w-80"
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
