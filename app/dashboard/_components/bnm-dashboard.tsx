import {
    ClipboardCheck,
    CheckCircle2,
    FileText,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getBNMStats, getBranchActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySection } from "./shared/activity-feed";
import type { AuthUser } from "@/lib/authorization";

export async function BnmDashboard({ user }: { user: AuthUser }) {
    const [bnmStats, activities] = await Promise.all([
        getBNMStats(user.branchNames),
        getBranchActivity(user.branchNames),
    ]);

    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6 items-start">
                {/* Stats Panel */}
                <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row">
                    {/* Hero stat */}
                    <Link
                        href="/reports?status=approved_bmc"
                        className="group shrink-0 lg:w-52 bg-orange-500 text-white
                                   flex flex-row items-center justify-between gap-4
                                   lg:flex-col lg:items-stretch lg:justify-between
                                   p-4 lg:p-5 hover:bg-orange-600 transition-colors"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 text-orange-100 text-xs font-medium">
                                <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                                Persetujuan Final
                            </div>
                            <p className="text-xs text-orange-100 mt-2 leading-snug hidden lg:block">
                                Laporan siap mendapat persetujuan Anda
                            </p>
                        </div>
                        <div className="flex items-end gap-2 shrink-0 lg:items-center">
                            <div className="text-4xl lg:text-5xl font-bold tabular-nums leading-none">
                                {bnmStats.awaitingApproval}
                            </div>
                            <TrendingUp className="h-4 w-4 text-orange-200 opacity-60 mb-0.5 hidden lg:block" />
                        </div>
                    </Link>

                    {/* Secondary stats */}
                    <div className="flex-1 grid grid-cols-2 divide-x divide-y lg:divide-y-0 bg-card">
                        <Link
                            href="/reports?status=completed"
                            className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <div>
                                <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                    {bnmStats.completed}
                                </div>
                                <p className="text-xs font-semibold mt-0.5">
                                    Selesai
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                    Telah disetujui
                                </p>
                            </div>
                        </Link>
                        <Link
                            href="/reports?status=view_all"
                            className="group p-3 lg:p-4 flex flex-col justify-between hover:bg-muted/40 transition-colors"
                        >
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <div>
                                <div className="text-2xl lg:text-3xl font-bold tabular-nums mt-2 lg:mt-3">
                                    {bnmStats.totalReports}
                                </div>
                                <p className="text-xs font-semibold mt-0.5">
                                    Total Laporan
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                    Semua laporan di branch
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Activity Feed */}
                <ActivitySection activities={activities} />
            </div>
        </DashboardShell>
    );
}
