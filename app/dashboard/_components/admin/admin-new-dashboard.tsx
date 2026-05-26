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
    type AdminKpiMetric,
    type AdminStatusDatum,
    type AdminTrendPeriod,
} from "../../queries";
import { ActivitySectionWide } from "../shared/activity-feed";
import { AdminTrendChart } from "./admin-overview-charts";
import { AdminDashboardShell } from "./admin-dashboard-shell";

const PERIOD_OPTIONS: { value: AdminTrendPeriod; label: string }[] = [
    { value: "ytd", label: "YTD" },
    { value: "30d", label: "30 Hari" },
    { value: "90d", label: "90 Hari" },
    { value: "12m", label: "12 Bulan" },
];

function normalizePeriod(value?: string): AdminTrendPeriod {
    if (value === "30d" || value === "90d" || value === "12m") {
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
        <Card className="h-40 w-full transition-colors hover:border-primary/40">
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
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block h-full">
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
                    <Link href="/activity">
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
                href="/dashboard/pjum"
            />
            <MetricCard
                title="User Aktif"
                value={formatNumber(kpi.activeUsers)}
                description="User non-admin yang terlihat online"
                icon={Users}
                tone="slate"
                href="/dashboard/users"
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
                    className="block h-full w-full"
                >
                    <div className="flex h-24 w-full flex-col justify-between rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:bg-muted/30">
                        <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">
                            {item.label}
                        </span>
                        <span className="font-mono text-3xl font-semibold leading-none">
                            {formatNumber(item.count)}
                        </span>
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

function TrendPeriodFilter({ period }: { period: AdminTrendPeriod }) {
    return (
        <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
                <Button
                    key={option.value}
                    asChild
                    size="sm"
                    variant={period === option.value ? "default" : "outline"}
                >
                    <Link href={`/dashboard?period=${option.value}`}>
                        {option.label}
                    </Link>
                </Button>
            ))}
        </div>
    );
}

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
                                            href={`/reports/${report.reportNumber}`}
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
            contentClassName="md:p-6"
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
                        <TrendPeriodFilter period={selectedPeriod} />
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
            <ActivitySectionWide
                activities={data.recentActivity}
                emptyMessage="Belum ada aktivitas terbaru untuk ditampilkan."
            />
        </AdminDashboardShell>
    );
}
