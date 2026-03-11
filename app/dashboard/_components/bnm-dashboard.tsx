import {
    ClipboardCheck,
    CheckCircle2,
    FileText,
} from "lucide-react";
import { getBNMStats, getBranchActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySectionWide } from "./shared/activity-feed";
import { DashboardStats, type DashboardHeroStat, type DashboardStatItem } from "./shared/dashboard-stats";
import type { AuthUser } from "@/lib/authorization";

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities] = await Promise.all([
        getBNMStats(user.branchNames),
        getBranchActivity(user.branchNames),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "awaiting-approval",
        label: "Persetujuan Final",
        description: "Laporan siap mendapat persetujuan Anda",
        value: bnmStats.awaitingApproval,
        icon: ClipboardCheck,
        href: "/reports?status=approved_bmc",
        colorClass: "text-orange-600",
        heroColorClass: "bg-orange-500 text-white hover:bg-orange-600",
        heroTextColorClass: "text-orange-100",
        heroTrendColorClass: "text-orange-200",
    };

    const secondaryStats: DashboardStatItem[] = [
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
                    <DashboardStats hero={heroStat} secondary={secondaryStats} />

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
