import { Card, CardContent } from "@/components/ui/card";
import {
    ClipboardCheck,
    CheckCircle2,
    FileText,
    Settings,
    ArrowRight,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getBNMStats, getBranchActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySection } from "./shared/activity-feed";
import type { AuthUser } from "@/lib/authorization";

const MENUS = [
    {
        title: "Persetujuan Final",
        description: "Setujui laporan yang telah diapprove BMC",
        icon: ClipboardCheck,
        href: "/reports",
        variant: "default" as const,
    },
];

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities] = await Promise.all([
        getBNMStats(user.branchNames),
        getBranchActivity(user.branchNames),
    ]);

    return (
        <DashboardShell user={user}>
            {/* Stats Panel */}
            <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row max-w-3xl">
                {/* Hero stat — Menunggu Approval Final */}
                <Link
                    href="/reports?status=approved_bmc"
                    className="group shrink-0 lg:w-64 bg-orange-500 text-white p-6 flex flex-col justify-between hover:bg-orange-600 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-100 text-sm font-medium">
                            <ClipboardCheck className="h-4 w-4" />
                            Persetujuan Final
                        </div>
                        <TrendingUp className="h-4 w-4 text-orange-200 opacity-70" />
                    </div>
                    <div>
                        <div className="text-6xl font-bold tabular-nums leading-none mt-4">
                            {bnmStats.awaitingApproval}
                        </div>
                        <p className="text-sm text-orange-100 mt-3 leading-snug">
                            Laporan siap mendapat persetujuan Anda
                        </p>
                    </div>
                </Link>

                {/* Secondary stats */}
                <div className="flex-1 grid grid-cols-2 divide-x divide-y lg:divide-y-0 bg-card">
                    <Link
                        href="/reports?status=completed"
                        className="group p-5 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold tabular-nums mt-3">
                                {bnmStats.completed}
                            </div>
                            <p className="text-sm font-semibold mt-1">
                                Selesai
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Telah disetujui
                            </p>
                        </div>
                    </Link>
                    <Link
                        href="/reports"
                        className="group p-5 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold tabular-nums mt-3">
                                {bnmStats.totalReports}
                            </div>
                            <p className="text-sm font-semibold mt-1">
                                Total Laporan
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Semua laporan di branch
                            </p>
                        </div>
                    </Link>
                </div>
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
                <ActivitySection activities={activities} />
            </div>
        </DashboardShell>
    );
}
