import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "./admin-site-header";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { getAdminOverviewStats, getAdminBranchChartData } from "../../queries";
import { getOnlineUsers } from "@/lib/presence";
import {
    AdminLaporanChart,
    AdminRealisasiChart,
} from "./admin-overview-charts";
import { AdminStatCards } from "./admin-stat-cards";
import type { AuthUser } from "@/lib/authorization";

export async function AdminNewDashboard({ user }: { user: AuthUser }) {
    const activeUserCount = getOnlineUsers().length;
    const [overviewStats, branchChartData] = await Promise.all([
        getAdminOverviewStats(activeUserCount),
        getAdminBranchChartData(),
    ]);

    const year = new Date().getFullYear();

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" user={user} />
            <SidebarInset>
                <SiteHeader title="Dashboard" />
                <div className="flex flex-col gap-6 p-4 lg:p-6">
                    {/* Summary Cards — colored, clickable */}
                    <AdminStatCards
                        totalReports={overviewStats.totalReports}
                        completed={overviewStats.completed}
                        activeUsers={overviewStats.activeUsers}
                        avgRealisasi={overviewStats.avgRealisasi}
                    />

                    {/* Charts */}
                    <div className="grid gap-6 grid-cols-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Laporan per Cabang</CardTitle>
                                <CardDescription>
                                    1 Januari {year} — hari ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AdminLaporanChart data={branchChartData} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Total Akumulasi Realisasi per Cabang
                                </CardTitle>
                                <CardDescription>
                                    1 Januari {year} — hari ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AdminRealisasiChart data={branchChartData} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
