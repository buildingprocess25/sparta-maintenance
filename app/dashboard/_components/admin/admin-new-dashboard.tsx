import Link from "next/link";
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    FileText,
    Info,
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
import { cn } from "@/lib/utils";
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
        <div className="grid gap-4 lg:grid-cols-3">
            <GroupedKpiCard
                title="Laporan"
                icon={FileText}
                href="/dashboard/reports"
                value={formatNumber(kpi.totalReports)}
                helper="Semua laporan non-draft tahun berjalan"
                rows={[
                    {
                        label: "Selesai",
                        value: formatNumber(kpi.completedReports),
                        href: "/dashboard/reports?status=COMPLETED",
                        tone: "green",
                    },
                    {
                        label: "Laporan Aktif",
                        value: formatNumber(kpi.activeReports),
                        href: "/dashboard/reports?scope=active",
                        tone: "blue",
                    },
                    {
                        label: "User aktif hari ini",
                        value: formatNumber(kpi.activeUsers),
                        href: "/dashboard/activity/online",
                        tone: "blue",
                    },
                ]}
            />
            <GroupedKpiCard
                title="Penyelesaian"
                icon={CheckCircle2}
                href="/dashboard/reports?status=COMPLETED"
                value={`${kpi.completionRate}%`}
                helper="Selesai dibanding seluruh laporan non-draft"
                progress={kpi.completionRate}
                rows={[
                    {
                        label: "Selesai",
                        value: formatNumber(kpi.completedReports),
                        tone: "green",
                    },
                    {
                        label: "Sudah PJUM",
                        value: formatNumber(
                            kpi.completedReports - kpi.unpjumCompletedReports,
                        ),
                        href: "/dashboard/reports?status=COMPLETED&pjumStatus=exported",
                        tone: "blue",
                    },
                    {
                        label: "Belum PJUM",
                        value: formatNumber(kpi.unpjumCompletedReports),
                        href: "/dashboard/reports?status=COMPLETED&pjumStatus=not_exported",
                        tone:
                            kpi.unpjumCompletedReports > 0 ? "amber" : "green",
                    },
                ]}
            />
            <GroupedKpiCard
                title="Realisasi & PJUM"
                icon={CircleDollarSign}
                href="/dashboard/realisasi"
                value={formatShortRp(kpi.totalRealisasi)}
                helper={`BMS / minggu all cabang ${formatRp(kpi.avgBmsWeeklyRealisasi)}`}
                rows={[
                    {
                        label: "PJUM tahun ini",
                        value: formatNumber(pjum.total),
                        href: "/dashboard/pjum",
                        tone: "blue",
                    },
                    {
                        label: "PJUM disetujui",
                        value: formatNumber(pjum.approved),
                        href: "/dashboard/pjum?status=APPROVED",
                        tone: "green",
                    },
                    {
                        label: "Review PJUM",
                        value: formatNumber(pjum.pending),
                        href: "/dashboard/pjum?status=PENDING_APPROVAL",
                        tone: pjum.pending > 0 ? "amber" : "slate",
                    },
                ]}
            />
        </div>
    );
}

type GroupedKpiRow = {
    label: string;
    value: string;
    href?: string;
    tone?: "blue" | "green" | "amber" | "red" | "slate";
};

const groupedKpiToneClass: Record<
    NonNullable<GroupedKpiRow["tone"]>,
    string
> = {
    blue: "text-sky-700",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    slate: "text-slate-700",
};

function GroupedKpiCard({
    title,
    icon: Icon,
    value,
    helper,
    href,
    rows,
    progress,
}: {
    title: string;
    icon: React.ElementType;
    value: string;
    helper: string;
    href: string;
    rows: GroupedKpiRow[];
    progress?: number;
}) {
    return (
        <section className="flex h-full flex-col rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {title}
                    </div>
                    <Link
                        href={href}
                        className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                        {value}
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {helper}
                    </p>
                </div>
            </div>

            <div className="mt-4 h-2">
                {typeof progress === "number" ? (
                    <Progress value={progress} />
                ) : null}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-3 border-t pt-4">
                {rows.map((row) => (
                    <KpiSubMetric key={row.label} row={row} />
                ))}
            </div>
        </section>
    );
}

function KpiSubMetric({ row }: { row: GroupedKpiRow }) {
    const tone = groupedKpiToneClass[row.tone ?? "slate"];
    const content = (
        <div className="min-w-0">
            <div className="truncate text-xs text-muted-foreground">
                {row.label}
            </div>
            <div
                className={`mt-1 inline-flex items-center gap-1 text-xl font-semibold leading-none ${tone}`}
            >
                {row.value}
                {row.href ? (
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                ) : null}
            </div>
        </div>
    );

    if (!row.href) return content;

    return (
        <Link href={row.href} className="rounded-md hover:bg-muted/40">
            {content}
        </Link>
    );
}

const SLA_STATUS_GUIDE = [
    {
        status: "PENDING_ESTIMATION",
        days: 1,
        note: "BMC harus mulai review estimasi.",
    },
    {
        status: "ESTIMATION_APPROVED",
        days: 3,
        note: "BMS mulai kerja setelah estimasi disetujui.",
    },
    {
        status: "ESTIMATION_REJECTED_REVISION",
        days: 2,
        note: "BMS memperbaiki estimasi yang dikembalikan.",
    },
    {
        status: "IN_PROGRESS",
        days: 7,
        note: "BMS menyelesaikan pekerjaan.",
    },
    {
        status: "PENDING_REVIEW",
        days: 1,
        note: "BMC review hasil pekerjaan.",
    },
    {
        status: "APPROVED_BMC",
        days: 1,
        note: "BNM melakukan approval final.",
    },
    {
        status: "REVIEW_REJECTED_REVISION",
        days: 2,
        note: "BMS memperbaiki hasil pekerjaan.",
    },
] as const;

function StatusDistributionKpis({ status }: { status: AdminStatusDatum[] }) {
    const visibleStatus = status.filter((item) => item.slaDays !== null);
    const totalActive = visibleStatus.reduce(
        (sum, item) => sum + item.count,
        0,
    );
    const totalOverdue = visibleStatus.reduce(
        (sum, item) => sum + item.overdueCount,
        0,
    );
    const safeCount = Math.max(totalActive - totalOverdue, 0);
    const safeRate =
        totalActive > 0 ? Math.round((safeCount / totalActive) * 100) : 100;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="text-sm text-muted-foreground">
                        Laporan aktif
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight">
                        {formatNumber(totalActive)}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge
                        variant="outline"
                        className={
                            totalOverdue > 0
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }
                    >
                        {totalOverdue > 0
                            ? `${formatNumber(totalOverdue)} lewat SLA`
                            : "SLA aman"}
                    </Badge>
                </div>
            </div>

            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {visibleStatus.map((item) => (
                    <span
                        key={item.status}
                        className={getStatusSegmentClass(item.status)}
                        style={{
                            width: `${Math.max(
                                3,
                                totalActive > 0
                                    ? (item.count / totalActive) * 100
                                    : 0,
                            )}%`,
                        }}
                    />
                ))}
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-24 text-right">
                                Jumlah
                            </TableHead>
                            <TableHead className="w-20 text-right">%</TableHead>
                            <TableHead className="w-36 text-right">
                                Kondisi SLA
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleStatus.map((item) => {
                            const percentage =
                                totalActive > 0
                                    ? Math.round(
                                          (item.count / totalActive) * 100,
                                      )
                                    : 0;

                            return (
                                <TableRow key={item.status}>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/reports?status=${item.status}`}
                                            className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${getStatusSegmentClass(
                                                    item.status,
                                                )}`}
                                            />
                                            {item.label}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatNumber(item.count)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {percentage}%
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.overdueCount > 0
                                                    ? "border-red-200 bg-red-50 text-red-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }
                                        >
                                            {item.overdueCount > 0
                                                ? `${formatNumber(item.overdueCount)} lewat batas`
                                                : `Batas ${item.slaDays} hari`}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatNumber(totalActive)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                100%
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge
                                    variant="outline"
                                    className={
                                        totalOverdue > 0
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    }
                                >
                                    {totalOverdue > 0
                                        ? `${formatNumber(totalOverdue)} lewat batas`
                                        : "SLA aman"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {visibleStatus.length === 0 && (
                <div className="flex min-h-24 items-center rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                    Belum ada laporan aktif dengan SLA.
                </div>
            )}
        </div>
    );
}

function SlaStatusGuide({ status }: { status: AdminStatusDatum[] }) {
    const statusMap = new Map(status.map((item) => [item.status, item]));

    return (
        <aside className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold">
                        Batas SLA per status
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Patokan ini membantu user melihat siapa yang perlu
                        follow up.
                    </p>
                </div>
                <Clock3 className="h-4 w-4 text-primary" />
            </div>

            <div className="mt-3 space-y-2">
                {SLA_STATUS_GUIDE.map((guide) => {
                    const current = statusMap.get(guide.status);
                    return (
                        <div
                            key={guide.status}
                            className="rounded-md border bg-muted/20 p-2"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusSegmentClass(
                                            guide.status,
                                        )}`}
                                    />
                                    <span className="truncate text-xs font-medium">
                                        {REPORT_STATUS_LABELS[guide.status]}
                                    </span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="shrink-0 bg-background"
                                >
                                    {guide.days} hari
                                </Badge>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                <span className="line-clamp-1">
                                    {guide.note}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

function getStatusSegmentClass(status: string) {
    const map: Record<string, string> = {
        PENDING_ESTIMATION: "bg-yellow-400",
        ESTIMATION_APPROVED: "bg-emerald-500",
        ESTIMATION_REJECTED_REVISION: "bg-orange-500",
        IN_PROGRESS: "bg-blue-500",
        PENDING_REVIEW: "bg-violet-500",
        APPROVED_BMC: "bg-cyan-500",
        REVIEW_REJECTED_REVISION: "bg-orange-600",
    };

    return map[status] ?? "bg-slate-400";
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
                        <Link href="/dashboard/branches">
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
                                    <Link
                                        href={`/dashboard/branches/${branch.branchName}`}
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
                        <Link href={viewHref}>
                            {viewLabel}
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
                    <StatusDistributionKpis status={data.status} />
                </div>
                <SlaStatusGuide status={data.status} />
            </section>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>Realisasi per Cabang</CardTitle>
                            <CardDescription>
                                Total realisasi dan rata-rata realisasi BMS per
                                minggu untuk membaca kecukupan uang muka cabang
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
                viewHref="/dashboard/reports?scope=overdue"
                viewLabel="Buka SLA"
            />
            <AdminRecentActivityCard activities={data.recentActivity} />
        </AdminDashboardShell>
    );
}
