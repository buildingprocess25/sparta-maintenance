import Link from "next/link";
import type { ElementType } from "react";
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
    type ManagerDashboardData,
    type ManagerDashboardReport,
    type ManagerDashboardRole,
} from "../queries";
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

function DashboardIntro({
    user,
    data,
    role,
}: {
    user: AuthUser;
    data: ManagerDashboardData;
    role: ManagerDashboardRole;
}) {
    const copy = getDashboardCopy(role);
    const branchLabel =
        data.branchNames.length > 0 ? data.branchNames.join(", ") : "-";

    return (
        <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="h-3.5 w-3.5" />
                        {branchLabel}
                    </span>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {copy.title}
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                        {copy.description}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground">
                    Masuk sebagai{" "}
                    <span className="font-medium text-foreground">
                        {user.name}
                    </span>
                </p>
            </div>
            <Button asChild>
                <Link href={copy.primaryHref}>
                    {copy.primaryLabel}
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    );
}

function ManagerKpiGrid({
    data,
    role,
}: {
    data: ManagerDashboardData;
    role: ManagerDashboardRole;
}) {
    const copy = getDashboardCopy(role);

    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CompactMetric
                title={copy.primaryLabel}
                value={formatNumber(data.kpi.pendingReports)}
                helper="Antrian yang butuh keputusan Anda"
                href={copy.primaryHref}
                icon={Clock3}
                tone="amber"
            />
            <CompactMetric
                title="Laporan Aktif"
                value={formatNumber(data.kpi.activeReports)}
                helper="Belum selesai dan masih bergerak"
                href="/dashboard/reports?scope=active"
                icon={Activity}
                tone="blue"
            />
            <CompactMetric
                title="Penyelesaian"
                value={`${data.kpi.completionRate}%`}
                helper={`${formatNumber(data.kpi.completedReports)} dari ${formatNumber(
                    data.kpi.totalReports,
                )} laporan`}
                href="/dashboard/reports?status=COMPLETED"
                icon={CheckCircle2}
                progress={data.kpi.completionRate}
                tone="green"
            />
            <CompactMetric
                title="Total Laporan sudah PJUM"
                value={formatNumber(data.kpi.approvedPjumReportCount)}
                helper={`${formatNumber(data.kpi.pendingPjum)} PJUM menunggu review`}
                href="/dashboard/pjum?status=APPROVED"
                icon={ReceiptText}
                tone={data.kpi.pendingPjum > 0 ? "amber" : "slate"}
            />
        </section>
    );
}

function CompactMetric({
    title,
    value,
    helper,
    href,
    icon: Icon,
    progress,
    tone,
}: {
    title: string;
    value: string;
    helper: string;
    href: string;
    icon: ElementType;
    progress?: number;
    tone: "amber" | "blue" | "green" | "slate";
}) {
    const toneClass = {
        amber: "bg-amber-50 text-amber-700",
        blue: "bg-sky-50 text-sky-700",
        green: "bg-emerald-50 text-emerald-700",
        slate: "bg-slate-100 text-slate-700",
    }[tone];

    return (
        <Link
            href={href}
            className="group flex min-h-[118px] flex-col justify-between rounded-lg border bg-background p-3 shadow-sm transition hover:border-primary/40 hover:bg-muted/20"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{title}</div>
                    <div className="mt-1 flex items-center gap-1 text-2xl font-semibold tracking-tight">
                        {value}
                        <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                </div>
                <span
                    className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        toneClass,
                    )}
                >
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <div className="space-y-2">
                {typeof progress === "number" ? (
                    <Progress value={progress} className="h-1.5" />
                ) : null}
                <div className="text-xs text-muted-foreground">{helper}</div>
            </div>
        </Link>
    );
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

function RecentActivity({ data }: { data: ManagerDashboardData }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4 text-primary" />
                            Aktivitas Terbaru
                        </CardTitle>
                        <CardDescription>
                            Pergerakan laporan dari cabang terkait.
                        </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/reports?scope=active">
                            Detail
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
                                <TableHead>Aktivitas</TableHead>
                                <TableHead>Laporan</TableHead>
                                <TableHead>Oleh</TableHead>
                                <TableHead>Waktu</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.recentActivity.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        Belum ada aktivitas terbaru.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.recentActivity.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "font-normal",
                                                    getActionBadgeClass(
                                                        activity.action,
                                                    ),
                                                )}
                                            >
                                                {getActivityActionLabel(
                                                    activity.action,
                                                    activity.isChecklistOnly,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/reports/${activity.reportNumber}`}
                                                className="inline-flex items-center gap-1 font-mono text-primary underline-offset-4 hover:underline"
                                            >
                                                {activity.reportNumber}
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <div className="mt-0.5 max-w-[260px] truncate text-[10px] text-muted-foreground">
                                                {activity.report.storeName ||
                                                    activity.report.branchName}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {activity.actor.name}
                                        </TableCell>
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
                </div>
            </CardContent>
        </Card>
    );
}

export async function ManagerDashboard({
    user,
    role,
}: {
    user: AuthUser;
    role: ManagerDashboardRole;
}) {
    const data = await getManagerDashboardData({
        role,
        branchNames: user.branchNames,
    });
    const copy = getDashboardCopy(role);

    return (
        <AdminDashboardShell
            user={user}
            title="Dashboard"
            breadcrumbs={[{ label: copy.title }]}
            contentClassName="md:p-6"
        >
            <DashboardIntro user={user} data={data} role={role} />
            <ManagerKpiGrid data={data} role={role} />
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                <PriorityReportsTable
                    reports={data.priorityReports}
                    role={role}
                />
                <SidePanel data={data} />
            </section>
            <RecentActivity data={data} />
        </AdminDashboardShell>
    );
}
