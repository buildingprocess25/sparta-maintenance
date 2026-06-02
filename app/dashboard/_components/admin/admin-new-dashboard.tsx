import Link from "next/link";
import {
    Activity,
    ArrowUpRight,
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    FileText,
    ListChecks,
    Users,
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
import type { AuthUser } from "@/lib/authorization";
import {
    getAdminCommandCenterData,
    type AdminAttentionReport,
    type AdminBranchPerformanceDatum,
    type ActivityItem,
    type AdminKpiMetric,
    type AdminStatusDatum,
} from "../../queries";
import { AdminTrendChart } from "./admin-overview-charts";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "./admin-trend-filter";

function normalizePeriod(value?: string): string {
    if (value === "30d" || value === "90d" || value === "12m") {
        return value;
    }
    if (value && /^\d{2}-\d{4}$/.test(value)) {
        return value;
    }

    return "ytd";
}

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

function formatRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatShortRp(value: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
        notation: "compact",
        compactDisplay: "short",
    }).format(value);
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

type MetricCardProps = {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
    href?: string;
    tone: "blue" | "green" | "amber" | "red" | "slate";
};

const metricToneClass: Record<MetricCardProps["tone"], string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
};

function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    href,
    tone,
}: MetricCardProps) {
    const content = (
        <Card className="group h-40 w-full transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardDescription>{title}</CardDescription>
                        <CardTitle className="text-2xl font-semibold">
                            {value}
                        </CardTitle>
                    </div>
                    <span
                        className={`rounded-md border p-2 ${metricToneClass[tone]}`}
                    >
                        <Icon className="h-4 w-4" />
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                    {href && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
                            Detail
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (!href) return content;

    return (
        <Link
            href={href}
            className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Buka detail ${title}`}
        >
            {content}
        </Link>
    );
}

function DashboardHeader({ kpi }: { kpi: AdminKpiMetric }) {
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
                    <Link href="/dashboard/activity">
                        <Activity className="h-4 w-4" />
                        Aktivitas
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard/reports">
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

function KpiGrid({
    kpi,
    pjum,
}: {
    kpi: AdminKpiMetric;
    pjum: Awaited<ReturnType<typeof getAdminCommandCenterData>>["pjum"];
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
                title="Total Laporan"
                value={formatNumber(kpi.totalReports)}
                description={`${kpi.completedReports} selesai, ${kpi.inProgressReports} sedang berjalan`}
                icon={FileText}
                tone="blue"
                href="/dashboard/reports"
            />
            <MetricCard
                title="Completion Rate"
                value={`${kpi.completionRate}%`}
                description="Persentase laporan selesai dari seluruh laporan non-draft"
                icon={CheckCircle2}
                tone="green"
                href="/dashboard/reports?status=COMPLETED"
            />
            <MetricCard
                title="Total Realisasi"
                value={formatShortRp(kpi.totalRealisasi)}
                description={`Rata-rata ${formatRp(kpi.avgRealisasi)} per laporan selesai`}
                icon={CircleDollarSign}
                tone="slate"
                href="/dashboard/realisasi"
            />
            <MetricCard
                title="PJUM Tahun Ini"
                value={formatNumber(pjum.total)}
                description={`${pjum.pending} pending, ${pjum.approved} approved, ${pjum.rejected} rejected`}
                icon={Banknote}
                tone="blue"
                href="/dashboard/pjum"
            />
            <MetricCard
                title="Completed Belum PJUM"
                value={formatNumber(kpi.unpjumCompletedReports)}
                description="Laporan selesai yang belum masuk rekap PJUM"
                icon={ListChecks}
                tone={kpi.unpjumCompletedReports > 0 ? "amber" : "green"}
                href="/dashboard/reports?status=COMPLETED&pjumStatus=not_exported"
            />
            <MetricCard
                title="User Aktif"
                value={formatNumber(kpi.activeUsers)}
                description="Terlihat aktif 5 menit terakhir"
                icon={Users}
                tone="slate"
                href="/dashboard/activity/online"
            />
        </div>
    );
}

function StatusDistributionKpis({ status }: { status: AdminStatusDatum[] }) {
    const visibleStatus = status.filter((item) => item.status !== "COMPLETED");
    const statusColumns = Math.max(visibleStatus.length, 1);
    return (
        <div
            className="grid w-full gap-3"
            style={{
                gridTemplateColumns: `repeat(${statusColumns}, minmax(0, 1fr))`,
            }}
        >
            {visibleStatus.map((item) => (
                <Link
                    key={item.status}
                    href={`/dashboard/reports?status=${item.status}`}
                    className="group block h-full w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Buka laporan status ${item.label}`}
                >
                    <div className="flex h-24 w-full flex-col justify-between rounded-lg border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm">
                        <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">
                            {item.label}
                        </span>
                        <div className="flex items-end justify-between gap-2">
                            <span className="font-mono text-3xl font-semibold leading-none">
                                {formatNumber(item.count)}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-70 transition-opacity group-hover:opacity-100" />
                        </div>
                    </div>
                </Link>
            ))}
            {visibleStatus.length === 0 && (
                <div className="col-span-full flex min-h-24 items-center rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                    Belum ada laporan non-draft.
                </div>
            )}
        </div>
    );
}

const ACTIVITY_LABELS: Record<string, string> = {
    SUBMITTED: "Laporan diajukan",
    RESUBMITTED_ESTIMATION: "Revisi estimasi diajukan",
    RESUBMITTED_WORK: "Revisi pekerjaan diajukan",
    WORK_STARTED: "Pekerjaan dimulai",
    COMPLETION_SUBMITTED: "Penyelesaian diajukan",
    ESTIMATION_APPROVED: "Estimasi disetujui",
    ESTIMATION_REJECTED_REVISION: "Revisi estimasi",
    ESTIMATION_REJECTED: "Estimasi ditolak",
    WORK_APPROVED: "Pekerjaan disetujui BMC",
    WORK_REJECTED_REVISION: "Revisi pekerjaan",
    FINAL_APPROVED_BNM: "Final disetujui BNM",
    FINAL_REJECTED_REVISION_BNM: "Revisi final BNM",
    ADMIN_REALISASI_REVISED: "Realisasi direvisi admin",
};

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

function AdminRecentActivityCard({
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
                        <Link href="/dashboard/activity">
                            Detail
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
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
                                            {ACTIVITY_LABELS[activity.action] ??
                                                activity.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/reports/${activity.reportNumber}`}
                                            className="font-mono font-medium text-primary hover:underline"
                                        >
                                            {activity.reportNumber}
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

function BranchPerformanceTable({
    branches,
}: {
    branches: AdminBranchPerformanceDatum[];
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
                        <Link href="/dashboard/reports">
                            Detail
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cabang</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Open</TableHead>
                            <TableHead>Selesai</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Realisasi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.map((branch) => (
                            <TableRow key={branch.branchName}>
                                <TableCell className="font-medium">
                                    {branch.branchName}
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
                                    <div className="flex min-w-24 items-center gap-2">
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
}: {
    reports: AdminAttentionReport[];
    title: string;
    description: string;
    emptyMessage: string;
    icon: React.ElementType;
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
                        <Link href="/dashboard/reports">
                            Buka
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
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
                                        <Link
                                            href={`/dashboard/reports/${report.reportNumber}`}
                                            className="font-mono text-xs font-medium text-primary hover:underline"
                                        >
                                            {report.reportNumber}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">
                                            {report.storeName ||
                                                report.ownerName}
                                        </p>
                                    </TableCell>
                                    <TableCell>{report.branchName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
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

export async function AdminNewDashboard({
    user,
    period,
}: {
    user: AuthUser;
    period?: string;
}) {
    const selectedPeriod = normalizePeriod(period);
    const data = await getAdminCommandCenterData(selectedPeriod);

    return (
        <AdminDashboardShell
            user={user}
            title="Dashboard"
            breadcrumbs={[{ label: "Dashboard" }]}
            contentClassName="md:p-6"
            headerActions={
                <AdminTrendPeriodFilter initialPeriod={selectedPeriod} />
            }
        >
            <DashboardHeader kpi={data.kpi} />
            <KpiGrid kpi={data.kpi} pjum={data.pjum} />

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Distribusi Status</CardTitle>
                        <CardDescription>
                            KPI komposisi status laporan tahun berjalan
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <StatusDistributionKpis status={data.status} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>Laporan Selesai per Cabang</CardTitle>
                            <CardDescription>
                                Jumlah laporan selesai dan rata-rata realisasi
                                per cabang berdasarkan data cabang dari user
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AdminTrendChart data={data.trends} />
                </CardContent>
            </Card>

            <BranchPerformanceTable branches={data.branches} />
            <AttentionTable
                reports={data.stuckReports}
                title="Stuck Reports"
                description="Laporan aktif yang tidak bergerak lebih dari 7 hari"
                emptyMessage="Tidak ada laporan stuck lebih dari 7 hari."
                icon={Clock3}
            />
            <AdminRecentActivityCard activities={data.recentActivity} />
        </AdminDashboardShell>
    );
}

