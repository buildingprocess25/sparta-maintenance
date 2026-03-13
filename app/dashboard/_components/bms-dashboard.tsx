import {
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Wrench,
    ClipboardCheck,
} from "lucide-react";
import { getUserStats, getBMSActivity } from "../queries";
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
        title: "Buat Laporan Baru",
        description: "Laporkan kerusakan atau maintenance yang diperlukan",
        icon: Plus,
        href: "/reports/create",
        variant: "default",
    },
    {
        title: "Penyelesaian Pekerjaan",
        description:
            "Dokumentasikan penyelesaian dengan foto & realisasi biaya",
        icon: ClipboardCheck,
        href: "/reports/complete",
        variant: "outline",
    },
];

export async function BmsDashboard({ user }: { user: AuthUser }) {
    const [stats, activities] = await Promise.all([
        getUserStats(user.NIK),
        getBMSActivity(user.NIK),
    ]);

    const heroStat: DashboardHeroStat = {
        id: "needs-action",
        label: "Perlu Tindakan",
        description: "Laporan siap dikerjakan atau butuh revisi",
        value: stats.needsAction,
        icon: AlertCircle,
        href: "/reports?status=needs_action",
        colorClass: "text-orange-600",
        heroColorClass: "bg-orange-500 text-white hover:bg-orange-600",
        heroTextColorClass: "text-orange-100",
        heroTrendColorClass: "text-orange-200",
    };

    const secondaryStats: DashboardStatItem[] = [
        {
            id: "waiting-review",
            label: "Menunggu Review",
            description: "Diproses pihak lain",
            value: stats.waitingReview,
            icon: Clock,
            href: "/reports?status=waiting_review",
            colorClass: "text-yellow-600",
        },
        {
            id: "in-progress",
            label: "Dikerjakan",
            description: "Sedang dalam pengerjaan",
            value: stats.inProgress,
            icon: Wrench,
            href: "/reports?status=in_progress",
            colorClass: "text-blue-600",
        },
        {
            id: "completed",
            label: "Selesai",
            description: "Laporan telah rampung",
            value: stats.completed,
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
                        emptyMessage="Laporan dan aktivitas terbaru Anda akan muncul di sini."
                    />
                </div>
            </div>
        </DashboardShell>
    );
}
