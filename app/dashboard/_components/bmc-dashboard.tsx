import {
    FolderOpen,
    Clock,
    CheckCircle2,
    Wrench,
    FileText,
    Plus,
    Users,
    Key,
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
        title: "Buat Dokumen PJUM",
        description: "Pertanggungjawaban Uang Muka per minggu dari BMS",
        icon: Plus,
        href: "/reports/pjum",
        variant: "default",
    },
    {
        title: "Lihat Riwayat Approval",
        description: "Riwayat persetujuan estimasi & penyelesaian",
        icon: FileText,
        href: "/reports/history",
        variant: "outline",
    },
    {
        title: "Arsip Dokumen Laporan Selesai",
        description:
            "Buka folder arsip dokumen laporan selesai cabang di Google Drive",
        icon: FolderOpen,
        href: "/api/drive/report-archive",
        variant: "outline",
        newTab: true,
    },
    {
        title: "Arsip Dokumen PJUM",
        description: "Buka folder arsip dokumen PJUM cabang di Google Drive",
        icon: FolderOpen,
        href: "/api/drive/pjum-archive",
        variant: "outline",
        newTab: true,
    },
    {
        title: "Manajemen BMS & Toko",
        description: "Kelola data user dan toko cabang",
        icon: Users,
        href: "/bmc/database",
        variant: "outline",
    },
    {
        title: "Ganti Password",
        description: "Perbarui password akun Anda",
        icon: Key,
        action: "change-password",
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
            id: "completed",
            label: "Selesai",
            description: "Laporan selesai",
            value: bmcStats.completed,
            icon: CheckCircle2,
            href: "/reports?status=completed",
            colorClass: "text-green-600",
        },
        {
            id: "total",
            label: "Total Laporan",
            description: "Semua laporan cabang",
            value: bmcStats.totalReports,
            icon: FileText,
            href: "/reports?status=view_all",
            colorClass: "text-indigo-600",
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
