import {
    ClipboardCheck,
    FolderOpen,
    SettingsIcon,
    Key,
    FileSpreadsheet,
    Database,
    TrendingUp,
    CheckCircle2,
    Loader2,
    Banknote,
    Receipt,
} from "lucide-react";
import { getGlobalActivity, getGlobalStats, getMonthlyTrend } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySectionWide } from "./shared/activity-feed";
import {
    DashboardMenus,
    type DashboardMenuItem,
} from "./shared/dashboard-menus";
import { MonthlyTrendChart } from "./admin/monthly-trend-chart";
import { StatusDonutChart } from "./admin/status-donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthUser } from "@/lib/authorization";

const MENUS: DashboardMenuItem[] = [
    {
        title: "Export Data",
        description: "Unduh data laporan & PJUM ke Excel",
        icon: FileSpreadsheet,
        href: "/admin/export",
        variant: "default",
    },
    {
        title: "Manajemen Database",
        description: "Kelola user & toko seluruh cabang",
        icon: Database,
        href: "/admin/database",
        variant: "outline",
    },
    {
        title: "Arsip Dokumen",
        description: "Kelola arsip dan dokumen",
        icon: FolderOpen,
        href: "/admin/archive",
        variant: "outline",
    },
    {
        title: "Pengaturan",
        description: "Pengaturan sistem dan user",
        icon: SettingsIcon,
        href: "/admin/settings",
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

function formatRp(n: number) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
    return `Rp ${n.toLocaleString("id-ID")}`;
}

export async function AdminDashboard({ user }: { user: AuthUser }) {
    const [activities, stats, trend] = await Promise.all([
        getGlobalActivity(10),
        getGlobalStats(),
        getMonthlyTrend(),
    ]);

    const other = stats.totalReports - stats.completed - stats.inProgress;

    const statCards = [
        {
            label: "Total Laporan",
            value: stats.totalReports,
            icon: ClipboardCheck,
            color: "text-blue-600",
        },
        {
            label: "Selesai",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-green-600",
        },
        // {
        //     label: "In Progress",
        //     value: stats.inProgress,
        //     icon: Loader2,
        //     color: "text-yellow-600",
        // },
        {
            label: "Total Estimasi",
            value: formatRp(stats.totalEstimation),
            icon: Banknote,
            color: "text-purple-600",
        },
        {
            label: "Total Realisasi",
            value: formatRp(stats.totalReal),
            icon: Receipt,
            color: "text-orange-600",
        },
    ];

    const driveFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    const archiveUrl = driveFolderId 
        ? `https://drive.google.com/drive/folders/${driveFolderId}`
        : "https://drive.google.com/drive/my-drive";

    const dynamicMenus = MENUS.map(m => 
        m.title === "Arsip Dokumen" 
            ? { ...m, href: archiveUrl, newTab: true } 
            : m
    );

    return (
        <DashboardShell user={user}>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {statCards.map((c) => (
                    <Card key={c.label} className="shadow-none">
                        <CardContent>
                            <div className="flex items-center gap-2 mb-1">
                                <c.icon
                                    className={`h-4 w-4 shrink-0 ${c.color}`}
                                />
                                <span className="text-xs text-muted-foreground truncate">
                                    {c.label}
                                </span>
                            </div>
                            <p className="text-2xl font-bold tracking-tight">
                                {c.value}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                {/* Left column: Menu */}
                <DashboardMenus menus={dynamicMenus} />

                {/* Right column: Charts + Branch Table + Activity */}
                <div className="space-y-4">
                    {/* Charts row */}
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                        <Card className="shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Tren Laporan 6 Bulan Terakhir
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MonthlyTrendChart data={trend} />
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                                    Distribusi Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatusDonutChart
                                    completed={stats.completed}
                                    inProgress={stats.inProgress}
                                    other={other > 0 ? other : 0}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Activity feed */}
                    <ActivitySectionWide activities={activities} />
                </div>
            </div>
        </DashboardShell>
    );
}
