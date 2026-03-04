import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FileText,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Settings,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getUserStats, getBMSActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySection } from "./shared/activity-feed";
import type { AuthUser } from "@/lib/authorization";

const MENUS = [
    {
        title: "Buat Laporan Baru",
        description: "Laporkan kerusakan atau maintenance yang diperlukan",
        icon: Plus,
        href: "/reports/create",
        variant: "default" as const,
    },
    {
        title: "Laporan Saya",
        description: "Lihat semua laporan yang sudah dibuat",
        icon: FileText,
        href: "/reports",
        variant: "outline" as const,
    },
];

export async function BmsDashboard({ user }: { user: AuthUser }) {
    const [stats, activities] = await Promise.all([
        getUserStats(user.NIK),
        getBMSActivity(user.NIK),
    ]);

    const dashboardStats = [
        {
            label: "Total Laporan",
            value: stats.totalReports.toString(),
            icon: FileText,
            color: "text-primary",
            href: "/reports",
        },
        {
            label: "Menunggu Tindakan",
            value: stats.pendingReports.toString(),
            icon: Clock,
            color: "text-yellow-600",
            href: "/reports",
        },
        {
            label: "Laporan Selesai",
            value: stats.approvedReports.toString(),
            icon: CheckCircle2,
            color: "text-green-600",
            href: "/reports?status=COMPLETED",
        },
        {
            label: "Estimasi Ditolak",
            value: stats.rejectedReports.toString(),
            icon: AlertCircle,
            color: "text-red-600",
            href: "/reports?status=ESTIMATION_REJECTED",
        },
    ];

    return (
        <DashboardShell user={user}>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                {dashboardStats.map((stat, i) => (
                    <Link key={i} href={stat.href} className="group">
                        <Card className="hover:shadow-md transition-shadow gap-2 py-3 md:py-6 cursor-pointer hover:border-primary/40">
                            <CardHeader className="flex flex-row items-center px-0 md:px-6 justify-center md:justify-between space-y-0">
                                <CardTitle className="text-xs text-center md:text-left md:text-sm font-medium w-12 md:w-auto">
                                    {stat.label}
                                </CardTitle>
                                <stat.icon
                                    className={`h-4 w-4 ${stat.color} hidden md:block`}
                                />
                            </CardHeader>
                            <CardContent className="md:items-start justify-center items-center gap-1 flex md:flex-col">
                                <div className="text-lg md:text-2xl md:text-left font-bold">
                                    {stat.value}
                                </div>
                                <stat.icon
                                    className={`h-3 w-3 ${stat.color} md:hidden`}
                                />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Menu */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Menu Utama
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MENUS.map((menu, index) => {
                            const Icon = menu.icon;
                            const isDefault = menu.variant === "default";
                            return (
                                <Link
                                    key={index}
                                    href={menu.href}
                                    className="group block h-full"
                                >
                                    <Card
                                        className={`h-full transition-all duration-200 ${
                                            isDefault
                                                ? "bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg hover:bg-primary/90"
                                                : "hover:border-primary/50 hover:shadow-md hover:bg-accent/5"
                                        }`}
                                    >
                                        <CardContent className="p-5 py-0 flex flex-row items-start gap-4">
                                            <div
                                                className={`p-3 rounded-xl shrink-0 transition-colors ${
                                                    isDefault
                                                        ? "bg-white/10"
                                                        : "bg-primary/10 group-hover:bg-primary/20"
                                                }`}
                                            >
                                                <Icon
                                                    className={`h-6 w-6 ${isDefault ? "text-white" : "text-primary"}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <h3
                                                    className={`font-semibold text:sm md:text-lg ${isDefault ? "text-white" : "text-foreground"}`}
                                                >
                                                    {menu.title}
                                                </h3>
                                                <p
                                                    className={`text-xs md:text-sm leading-relaxed ${isDefault ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                                                >
                                                    {menu.description}
                                                </p>
                                            </div>
                                            {isDefault && (
                                                <ArrowRight className="h-5 w-5 ml-auto self-center text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Activity Feed */}
                <ActivitySection
                    activities={activities}
                    emptyMessage="Laporan dan aktivitas terbaru Anda akan muncul di sini."
                />
            </div>
        </DashboardShell>
    );
}
