import Link from "next/link";
import type { ElementType } from "react";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    ReceiptText,
    Store,
    Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminDashboardShell } from "./admin/admin-dashboard-shell";
import type { AuthUser } from "@/lib/authorization";
import { cn, formatDashboardCurrency } from "@/lib/utils";
import {
    getManagerDashboardData,
    getAdminCommandCenterData,
    type ManagerDashboardData,
    type ManagerDashboardReport,
    type ManagerDashboardRole,
} from "../queries";
import { 
    DashboardHeader, 
    KpiGrid, 
    StatusDistributionKpis, 
    SlaStatusGuide, 
    AdminRecentActivityCard
} from "./admin/admin-new-dashboard";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";
import { getPjumStatusBadgeClass, getPjumStatusLabel } from "@/lib/pjum-status";
import {
    getActionBadgeClass,
    getActivityActionLabel,
} from "../activity/activity-format";
import { formatJakartaDate } from "@/lib/time";

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

function formatRp(value: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatShortRp(value: number): string {
    return formatDashboardCurrency(value);
}

function formatDate(date: Date): string {
    return formatJakartaDate(date);
}

function formatRelativeDate(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return "Kemarin";
    if (diffDay < 7) return `${diffDay} hari lalu`;

    return formatDate(date);
}

function getDashboardCopy(role: ManagerDashboardRole) {
    if (role === "BNM_MANAGER") {
        return {
            title: "Dashboard BNM",
            eyebrow: "Area BNM",
            description:
                "Pantau approval final laporan, review PJUM, dan aktivitas cabang yang menjadi tanggung jawab Anda.",
            primaryLabel: "Review Final",
            primaryHref: "/dashboard/reports?scope=review_bnm",
            priorityTitle: "Laporan Menunggu Final BNM",
            priorityDescription:
                "Laporan yang sudah disetujui BMC dan membutuhkan keputusan final.",
        };
    }

    return {
        title: "Dashboard BMC",
        eyebrow: "Area BMC",
        description:
            "Pantau laporan cabang, review estimasi, review penyelesaian pekerjaan, dan status PJUM BMS.",
        primaryLabel: "Perlu Review Anda",
        primaryHref: "/dashboard/reports?scope=review_bmc",
        priorityTitle: "Laporan Menunggu Review BMC",
        priorityDescription:
            "Estimasi dan penyelesaian pekerjaan yang perlu segera ditinjau.",
    };
}



function PriorityReportsTable({
    reports,
    role,
}: {
    reports: ManagerDashboardReport[];
    role: ManagerDashboardRole;
}) {
    const copy = getDashboardCopy(role);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="text-base">
                            {copy.priorityTitle}
                        </CardTitle>
                        <CardDescription>
                            {copy.priorityDescription}
                        </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={copy.primaryHref}>
                            Buka tabel
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table className="text-xs" containerClassName="max-h-[400px]">
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="min-w-[150px]">
                                    Laporan
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    Toko
                                </TableHead>
                                <TableHead className="min-w-[130px]">
                                    Status
                                </TableHead>
                                <TableHead className="w-[110px]">
                                    Umur
                                </TableHead>
                                <TableHead className="min-w-[160px] text-right">
                                    Biaya
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        Tidak ada laporan prioritas saat ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow key={report.reportNumber}>
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/reports/${report.reportNumber}`}
                                                className="inline-flex items-center gap-1 font-mono font-medium text-primary underline-offset-4 hover:underline"
                                            >
                                                {report.reportNumber}
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                {formatRelativeDate(
                                                    report.lastActivityAt,
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[260px] truncate font-medium">
                                                {report.storeName || "-"}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {report.ownerName}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={report.status}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {report.ageDays} hari
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <div className="grid grid-cols-[50px_minmax(0,1fr)] gap-x-2 gap-y-0.5">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Estimasi
                                                </span>
                                                <span className="text-right font-medium tabular-nums">
                                                    {formatRp(
                                                        report.totalEstimation,
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Realisasi
                                                </span>
                                                <span className="text-right font-medium tabular-nums">
                                                    {report.totalReal === null
                                                        ? "-"
                                                        : formatRp(
                                                              report.totalReal,
                                                          )}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function SidePanel({ data }: { data: ManagerDashboardData }) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">
                                PJUM Menunggu
                            </CardTitle>
                            <CardDescription>
                                Dokumen yang belum mendapat keputusan BNM.
                            </CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/dashboard/pjum?status=PENDING_APPROVAL">
                                Detail
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {data.pendingPjums.length === 0 ? (
                        <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                            Tidak ada PJUM pending.
                        </div>
                    ) : (
                        data.pendingPjums.map((pjum) => (
                            <Link
                                key={pjum.id}
                                href={`/dashboard/pjum/${pjum.id}`}
                                className="flex items-center justify-between gap-3 rounded-md border bg-background p-2 text-xs hover:border-primary/40 hover:bg-muted/30"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            Minggu {pjum.weekNumber}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "h-5 text-[10px] font-normal",
                                                getPjumStatusBadgeClass(
                                                    pjum.status,
                                                ),
                                            )}
                                        >
                                            {getPjumStatusLabel(pjum.status)}
                                        </Badge>
                                    </div>
                                    <div className="mt-1 truncate text-muted-foreground">
                                        {pjum.bmsName} · {pjum.reportCount}{" "}
                                        laporan
                                    </div>
                                </div>
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                            </Link>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Wallet className="h-4 w-4 text-primary" />
                        Realisasi Selesai
                    </CardTitle>
                    <CardDescription>
                        Total realisasi dari laporan selesai.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link
                        href="/dashboard/reports?status=COMPLETED&pjumStatus=exported"
                        className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-primary underline-offset-4 hover:underline"
                    >
                        {formatShortRp(data.kpi.totalRealisasi)}
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Gunakan data ini untuk membaca beban biaya cabang.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



export async function ManagerDashboard({
    user,
    role,
    period,
    brand,
}: {
    user: AuthUser;
    role: ManagerDashboardRole;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const data = await getManagerDashboardData({
        role,
        branchNames: user.branchNames,
    });
    const copy = getDashboardCopy(role);
    const resolvedPeriod = (period as any) || "ytd";
    const resolvedBrand = brand || "ALL";
    const adminData = await getAdminCommandCenterData(
        resolvedPeriod,
        resolvedBrand,
        user.branchNames
    );

    return (
        <AdminDashboardShell
            user={user}
            title={copy.title}
            breadcrumbs={[{ label: copy.title }]}
            contentClassName="md:p-6 space-y-6"
        >
            <DashboardHeader kpi={adminData.kpi} brand={resolvedBrand} />
            <KpiGrid 
                kpi={adminData.kpi} 
                pjum={adminData.pjum} 
                breakdown={adminData.brandBreakdown} 
                isBrandFiltered={resolvedBrand !== "ALL"} 
                brand={resolvedBrand} 
            />
            
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Distribusi Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StatusDistributionKpis status={adminData.status} breakdown={undefined} />
                        </CardContent>
                    </Card>
                </div>
                <SlaStatusGuide />
            </div>
            
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start pt-6 border-t mt-8">
                <PriorityReportsTable
                    reports={data.priorityReports}
                    role={role}
                />
                <SidePanel data={data} />
            </div>
            
            <AdminRecentActivityCard activities={adminData.recentActivity} />
        </AdminDashboardShell>
    );
}
