import { Suspense } from "react";
import Link from "next/link";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { AdminDashboardSkeleton } from "./admin-dashboard-skeleton";
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    FileText,
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { AuthUser } from "@/lib/authorization";
import {
    getReportStatusBadgeClass,
    REPORT_STATUS_LABELS,
} from "@/lib/report-status";
import { cn, formatDashboardCurrency } from "@/lib/utils";
import {
    getAdminCommandCenterData,
    type AdminAttentionReport,
    type AdminBranchPerformanceDatum,
    type ActivityItem,
    type AdminKpiMetric,
    type AdminPjumSummary,
    type AdminStatusDatum,
    type AdminTrendPeriod,
} from "../../queries";
import { AdminTrendChart } from "./admin-overview-charts";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "./admin-trend-filter";
import { getAdminRecentActivityLabel } from "./admin-activity-label";
import { formatJakartaDate } from "@/lib/time";
import { StatusDistributionKpis } from "./status-distribution";
import { SlaStatusGuide } from "./sla-status-guide";
import { KpiGrid } from "./kpi-cards";

function normalizePeriod(value?: string): string {
    if (value === "30d" || value === "90d" || value === "12m") {
        return value;
    }
    if (value && /^\d{2}-\d{4}$/.test(value)) {
        return value;
    }

    return "ytd";
}

function withBrandHref(href: string, brand: StoreBrandFilter) {
    if (brand === "ALL") return href;
    return `${href}${href.includes("?") ? "&" : "?"}brand=${brand}`;
}
function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

function formatRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatShortRp(value: number): string {
    return formatDashboardCurrency(value);
}

function formatDate(date: Date): string {
    return formatJakartaDate(date);
}

export function DashboardHeader({ kpi, brand }: { kpi: AdminKpiMetric; brand: StoreBrandFilter }) {
    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Ringkasan Operasional
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    Monitor status laporan, realisasi biaya, performa cabang,
                    dan antrian PJUM tahun berjalan.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                    <Link prefetch={false} href="/dashboard/activity">
                        <Activity className="h-4 w-4" />
                        Aktivitas
                    </Link>
                </Button>
                <Button asChild>
                    <Link prefetch={false} href={withBrandHref("/dashboard/reports", brand)}>
                        <FileText className="h-4 w-4" />
                        Semua Laporan
                    </Link>
                </Button>
            </div>
            <div className="sr-only">
                Completion rate {kpi.completionRate} persen
            </div>
        </div>
    );
}



function getActivityBadgeClass(action: string) {
    if (action.includes("REJECTED")) {
        return "border-red-200 bg-red-50 text-red-700";
    }
    if (action.includes("APPROVED")) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (action.includes("REVISION") || action.includes("REVISED")) {
        return "border-orange-200 bg-orange-50 text-orange-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
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

export function AdminRecentActivityCard({
    activities,
}: {
    activities: ActivityItem[];
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Aktivitas User Terbaru
                        </CardTitle>
                        <CardDescription>
                            Update operasional terbaru dari seluruh cabang
                        </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link prefetch={false} href="/dashboard/activity">
                            Detail
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs" containerClassName="max-h-[400px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Aktivitas</TableHead>
                            <TableHead>Laporan</TableHead>
                            <TableHead>Cabang</TableHead>
                            <TableHead>Oleh</TableHead>
                            <TableHead>Waktu</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activities.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-sm text-muted-foreground"
                                >
                                    Belum ada aktivitas terbaru untuk
                                    ditampilkan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            activities.map((activity) => (
                                <TableRow key={activity.id}>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={getActivityBadgeClass(
                                                activity.action,
                                            )}
                                        >
                                            {getAdminRecentActivityLabel(activity)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Link prefetch={false}
                                            href={`/dashboard/reports/${activity.reportNumber}`}
                                            className="font-mono text-xs font-medium text-primary hover:underline flex items-center gap-1 group"
                                        >
                                            {activity.reportNumber}
                                            <ArrowUpRight className="h-3 w-3 " />
                                        </Link>
                                        <p className="text-muted-foreground">
                                            {activity.report.storeName || "-"}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        {activity.report.branchName}
                                    </TableCell>
                                    <TableCell>{activity.actor.name}</TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                        {formatRelativeDate(
                                            new Date(activity.createdAt),
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// Removed TrendPeriodFilter definition

export function BranchPerformanceTable({
    branches,
    brand,
}: {
    branches: AdminBranchPerformanceDatum[];
    brand: StoreBrandFilter;
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Performa Cabang</CardTitle>
                        <CardDescription>
                            Diurutkan dari cabang dengan open report terbanyak
                        </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link prefetch={false} href={withBrandHref("/dashboard/branches", brand)}>
                            Detail
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs" containerClassName="max-h-[400px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cabang</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Open</TableHead>
                            <TableHead>Selesai PJUM</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Realisasi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.map((branch) => (
                            <TableRow key={branch.branchName}>
                                <TableCell className="font-medium">
                                    <Link prefetch={false}
                                        href={withBrandHref(`/dashboard/branches/${encodeURIComponent(branch.branchName)}`, brand)}
                                        className="text-primary hover:underline flex items-center gap-1 group"
                                    >
                                        {branch.branchName}
                                        <ArrowUpRight className="h-3 w-3 " />
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {formatNumber(branch.totalReports)}
                                </TableCell>
                                <TableCell>
                                    {formatNumber(branch.openReports)}
                                </TableCell>
                                <TableCell>
                                    {formatNumber(branch.completedReports)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex min-w-50 items-center gap-2">
                                        <Progress
                                            value={branch.completionRate}
                                        />
                                        <span className="w-10 text-xs text-muted-foreground">
                                            {branch.completionRate}%
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {formatShortRp(branch.totalRealisasi)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function AttentionTable({
    reports,
    title,
    description,
    emptyMessage,
    icon: Icon,
    viewHref = "/dashboard/reports",
    viewLabel = "Buka",
}: {
    reports: AdminAttentionReport[];
    title: string;
    description: string;
    emptyMessage: string;
    icon: React.ElementType;
    viewHref?: string;
    viewLabel?: string;
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            {title}
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link prefetch={false} href={viewHref}>
                            {viewLabel}
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs" containerClassName="max-h-[400px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Laporan</TableHead>
                            <TableHead>Cabang</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Umur</TableHead>
                            <TableHead>Update</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map((report) => (
                                <TableRow key={report.reportNumber}>
                                    <TableCell>
                                        <Link prefetch={false}
                                            href={`/dashboard/reports/${report.reportNumber}`}
                                            className="font-mono text-xs font-medium text-primary hover:underline flex items-center gap-1 group"
                                        >
                                            {report.reportNumber}
                                            <ArrowUpRight className="h-3 w-3 " />
                                        </Link>
                                        <p className="text-xs text-muted-foreground">
                                            {report.storeName ||
                                                report.ownerName}
                                        </p>
                                    </TableCell>
                                    <TableCell>{report.branchName}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "h-5 text-[11px]",
                                                getReportStatusBadgeClass(
                                                    report.status,
                                                ),
                                            )}
                                        >
                                            {report.statusLabel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{report.ageDays} hari</TableCell>
                                    <TableCell>
                                        {formatDate(report.updatedAt)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

async function AdminDashboardContent({ 
    period, 
    brand 
}: { 
    period: AdminTrendPeriod; 
    brand: StoreBrandFilter 
}) {
    const data = await getAdminCommandCenterData(period, brand);

    return (
        <>
            <DashboardHeader kpi={data.kpi} brand={brand} />
            <KpiGrid
                kpi={data.kpi}
                pjum={data.pjum}
                breakdown={data.brandBreakdown}
                isBrandFiltered={brand !== "ALL"}
                brand={brand}
            />

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            Distribusi Status &amp; SLA
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Komposisi laporan aktif dan status yang melewati
                            batas waktu operasional.
                        </p>
                    </div>
                    <StatusDistributionKpis 
                        status={data.status} 
                        breakdown={data.brandBreakdown ? { alfamart: data.brandBreakdown.alfamart.kpi.activeReports, lawson: data.brandBreakdown.lawson.kpi.activeReports } : undefined} 
                    />
                </div>
                <SlaStatusGuide />
            </section>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>
                                Realisasi per Cabang (Sudah PJUM)
                            </CardTitle>
                            <CardDescription>
                                Total realisasi yang sudah PJUM dan rata-rata
                                realisasi BMS per minggu untuk membaca kecukupan
                                uang muka cabang
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AdminTrendChart data={data.trends} />
                </CardContent>
            </Card>

            <BranchPerformanceTable branches={data.branches} brand={brand} />
            <AttentionTable
                reports={data.stuckReports}
                title="Stuck Reports"
                description="Laporan aktif yang tidak bergerak lebih dari 7 hari"
                emptyMessage="Tidak ada laporan stuck lebih dari 7 hari."
                icon={Clock3}
                viewHref={withBrandHref("/dashboard/reports?scope=overdue", brand)}
                viewLabel="Buka SLA"
            />
            <AdminRecentActivityCard activities={data.recentActivity} />
        </>
    );
}

export function AdminNewDashboard({
    user,
    period,
    brand,
}: {
    user: AuthUser;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const selectedPeriod = normalizePeriod(period);
    const selectedBrand = brand ?? "ALL";

    return (
        <AdminDashboardShell
            user={user}
            title="Dashboard"
            breadcrumbs={[{ label: "Dashboard" }]}
            contentClassName="md:p-6"
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={selectedPeriod}
                    initialBrand={selectedBrand}
                    showBrandFilter
                />
            }
        >
            <Suspense fallback={<AdminDashboardSkeleton />}>
                <AdminDashboardContent period={selectedPeriod as AdminTrendPeriod} brand={selectedBrand} />
            </Suspense>
        </AdminDashboardShell>
    );
}
