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
    const activeUserCount = (await getOnlineUsers()).length;
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
                <div className="flex flex-col gap-2 md:gap-6 p-2 md:p-6">
                    <AdminStatCards
                        totalReports={overviewStats.totalReports}
                        completed={overviewStats.completed}
                        activeUsers={overviewStats.activeUsers}
                        avgRealisasi={overviewStats.avgRealisasi}
                    />

                    <div className="grid gap-2 md:gap-6 grid-cols-1">
                        <Card className="rounded-xl">
                            <CardHeader className="px-3 md:px-6">
                                <CardTitle className="text-xs md:text-xl font-semibold">
                                    Total laporan per cabang
                                </CardTitle>
                                <CardDescription className="text-[10px] md:text-sm">
                                    1 Januari {year} hingga hari ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 md:px-6 md:pt-0">
                                <AdminLaporanChart data={branchChartData} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl">
                            <CardHeader className="px-3 md:px-6">
                                <CardTitle className="text-xs md:text-xl font-semibold">
                                    Total akumulasi realisasi per cabang
                                </CardTitle>
                                <CardDescription className="text-[10px] md:text-sm">
                                    1 Januari {year} hingga hari ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 md:px-6 md:pt-0">
                                <AdminRealisasiChart data={branchChartData} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
