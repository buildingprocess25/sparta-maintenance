import { Card, CardContent } from "@/components/ui/card";
import {
    FolderOpen,
    Clock,
    CheckCircle2,
    Wrench,
    Hourglass,
    ArrowRight,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getBMCStats, getBranchActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySection } from "./shared/activity-feed";
import type { AuthUser } from "@/lib/authorization";

export async function BmcDashboard({ user }: { user: AuthUser }) {
    const [bmcStats, activities] = await Promise.all([
        getBMCStats(user.branchNames),
        getBranchActivity(user.branchNames),
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
                            href="/reports"
                            className="group shrink-0 lg:w-52 bg-orange-500 text-white
                                       flex flex-row items-center justify-between gap-4
                                       lg:flex-col lg:items-stretch lg:justify-between
                                       p-4 lg:p-5 hover:bg-orange-600 transition-colors"
                        >
                            <div>
                                <div className="flex items-center gap-1.5 text-orange-100 text-xs font-medium">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    Perlu Ditinjau
                                </div>
                                <p className="text-xs text-orange-100 mt-2 leading-snug hidden lg:block">
                                    Estimasi & penyelesaian menunggu review Anda
                                </p>
                            </div>
                            <div className="flex items-end gap-2 shrink-0 lg:items-center">
                                <div className="text-4xl lg:text-5xl font-bold tabular-nums leading-none">
                                    {bmcStats.needsReview}
                                </div>
                                <TrendingUp className="h-4 w-4 text-orange-200 opacity-60 mb-0.5 hidden lg:block" />
                            </div>
                        </Link>

                        {/* Secondary stats */}
                        <div className="flex-1 grid grid-cols-3 divide-x divide-y lg:divide-y-0 bg-card">
                            <Link
                                href="/reports?status=in_progress"
                                className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                            >
                                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                                <div>
                                    <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                        {bmcStats.inProgress}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Dalam Proses
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        BMS sedang mengerjakan
                                    </p>
                                </div>
                            </Link>
                            <Link
                                href="/reports?status=approved_bmc"
                                className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                            >
                                <Hourglass className="h-3.5 w-3.5 text-purple-600" />
                                <div>
                                    <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                        {bmcStats.awaitingFinal}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Menunggu Manager
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        Menunggu persetujuan final
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
                                        {bmcStats.completed}
                                    </div>
                                    <p className="text-xs font-semibold mt-0.5">
                                        Selesai
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                        Disetujui BnM Manager
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Menu Card */}
                    <Link href="/reports/history" className="group block">
                        <Card className="transition-all duration-200 bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg hover:bg-primary/90">
                            <CardContent className="p-4 flex flex-row items-center gap-3">
                                <div className="p-2.5 rounded-lg shrink-0 bg-white/10">
                                    <FolderOpen className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-sm text-white leading-tight">
                                        Riwayat Approval
                                    </h3>
                                    <p className="text-xs text-primary-foreground/70 mt-0.5">
                                        Riwayat persetujuan estimasi &
                                        penyelesaian
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Right column: Activity Feed */}
                <ActivitySection activities={activities} />
            </div>
        </DashboardShell>
    );
}
