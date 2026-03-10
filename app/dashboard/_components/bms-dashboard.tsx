import { Card, CardContent } from "@/components/ui/card";
import {
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Wrench,
    ArrowRight,
    TrendingUp,
    ClipboardCheck,
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
        title: "Penyelesaian Pekerjaan",
        description:
            "Dokumentasikan penyelesaian dengan foto & realisasi biaya",
        icon: ClipboardCheck,
        href: "/reports/complete",
        variant: "outline" as const,
    },
];

export async function BmsDashboard({ user }: { user: AuthUser }) {
    const [stats, activities] = await Promise.all([
        getUserStats(user.NIK),
        getBMSActivity(user.NIK),
    ]);

    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6 items-start">
                {/* Left column: Stats + Menu */}
                <div className="space-y-4">
                    {/* Stats Panel */}
                    <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row">
                        {/* Hero stat */}
                        <Link
                            href="/reports?status=needs_action"
                            className="group shrink-0 lg:w-52 bg-orange-500 text-white
                                       flex flex-row items-center justify-between gap-4
                                       lg:flex-col lg:items-stretch lg:justify-between
                                       p-4 lg:p-5 hover:bg-orange-600 transition-colors"
                        >
                            <div>
                                <div className="flex items-center gap-1.5 text-orange-100 text-xs font-medium">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    Perlu Tindakan
                                </div>
                                <p className="text-xs text-orange-100 mt-2 leading-snug hidden lg:block">
                                    Laporan siap dikerjakan atau butuh revisi
                                </p>
                            </div>
                            <div className="flex items-end gap-2 shrink-0 lg:items-center">
                                <div className="text-4xl lg:text-5xl font-bold tabular-nums leading-none">
                                    {stats.needsAction}
                                </div>
                                <TrendingUp className="h-4 w-4 text-orange-200 opacity-60 mb-0.5 hidden lg:block" />
                            </div>
                        </Link>

                        {/* Secondary stats */}
                        <div className="flex-1 grid grid-cols-3 divide-x divide-y lg:divide-y-0 bg-card">
                            <Link
                                href="/reports?status=waiting_review"
                                className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                            >
                                <Clock className="h-3.5 w-3.5 text-yellow-600" />
                                <div>
                                    <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                        {stats.waitingReview}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Menunggu Review
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        Diproses pihak lain
                                    </p>
                                </div>
                            </Link>
                            <Link
                                href="/reports?status=in_progress"
                                className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                            >
                                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                                <div>
                                    <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                        {stats.inProgress}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Dikerjakan
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        Sedang dalam pengerjaan
                                    </p>
                                </div>
                            </Link>
                            <Link
                                href="/reports?status=completed"
                                className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                <div>
                                    <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                        {stats.completed}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Selesai
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        Laporan telah rampung
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Menu Cards */}
                    <div className="grid grid-cols-2 gap-3">
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
                                        <CardContent className="p-4 flex flex-row items-center gap-3">
                                            <div
                                                className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                                                    isDefault
                                                        ? "bg-white/10"
                                                        : "bg-primary/10 group-hover:bg-primary/20"
                                                }`}
                                            >
                                                <Icon
                                                    className={`h-5 w-5 ${
                                                        isDefault
                                                            ? "text-white"
                                                            : "text-primary"
                                                    }`}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className={`font-semibold text-sm leading-tight ${
                                                        isDefault
                                                            ? "text-white"
                                                            : "text-foreground"
                                                    }`}
                                                >
                                                    {menu.title}
                                                </h3>
                                                <p
                                                    className={`text-xs mt-0.5 leading-snug line-clamp-2 ${
                                                        isDefault
                                                            ? "text-primary-foreground/70"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {menu.description}
                                                </p>
                                            </div>
                                            {isDefault && (
                                                <ArrowRight className="h-4 w-4 shrink-0 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Right column: Activity Feed */}
                <ActivitySection
                    activities={activities}
                    emptyMessage="Laporan dan aktivitas terbaru Anda akan muncul di sini."
                />
            </div>
        </DashboardShell>
    );
}
