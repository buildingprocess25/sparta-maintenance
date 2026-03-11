import {
    FolderOpen,
    Clock,
    CheckCircle2,
    Wrench,
    Hourglass,
} from "lucide-react";
import { getBMCStats, getBranchActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySectionWide } from "./shared/activity-feed";
import {
    DashboardStats,
    type DashboardHeroStat,
    type DashboardStatItem,
} from "./shared/dashboard-stats";
import {
    DashboardMenus,
    type DashboardMenuItem,
} from "./shared/dashboard-menus";
import type { AuthUser } from "@/lib/authorization";

const MENUS: DashboardMenuItem[] = [
    {
        title: "Lihat Riwayat Approval",
        description: "Riwayat persetujuan estimasi & penyelesaian",
        icon: FolderOpen,
        href: "/reports/history",
        variant: "outline",
    },
];

export async function BmcDashboard({ user }: { user: AuthUser }) {
    const [bmcStats, activities] = await Promise.all([
        getBMCStats(user.branchNames),
        getBranchActivity(user.branchNames),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "needs-review",
        label: "Perlu Ditinjau",
        description: "Estimasi & penyelesaian menunggu review Anda",
        value: bmcStats.needsReview,
        icon: Clock,
        href: "/reports",
        colorClass: "text-orange-600",
        heroColorClass: "bg-orange-500 text-white hover:bg-orange-600",
        heroTextColorClass: "text-orange-100",
        heroTrendColorClass: "text-orange-200",
    };

    const secondaryStats: DashboardStatItem[] = [
        {
            id: "in-progress",
            label: "Dalam Proses",
            description: "BMS sedang mengerjakan",
            value: bmcStats.inProgress,
            icon: Wrench,
            href: "/reports?status=in_progress",
            colorClass: "text-blue-600",
        },
        {
            id: "awaiting-final",
            label: "Menunggu Manager",
            description: "Menunggu persetujuan final",
            value: bmcStats.awaitingFinal,
            icon: Hourglass,
            href: "/reports?status=approved_bmc",
            colorClass: "text-purple-600",
        },
        {
            id: "completed",
            label: "Selesai",
            description: "Disetujui BnM Manager",
            value: bmcStats.completed,
            icon: CheckCircle2,
            href: "/reports?status=completed",
            colorClass: "text-green-600",
        },
    ];

    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                {/* Left column: Menu (1/4) */}
                <DashboardMenus menus={MENUS} />

                {/* Right column: Stats + Activity (3/4) */}
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
