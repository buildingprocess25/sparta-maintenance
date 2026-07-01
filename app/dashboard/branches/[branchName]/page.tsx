import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Clock3,
    FileText,
    ListChecks,
    ReceiptText,
    Store,
    Users,
} from "lucide-react";
import { getAuthUser } from "@/lib/authorization";
import { formatJakartaDate, formatJakartaDateTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "../../_components/admin/admin-trend-filter";
import {
    getAdminBranchDetail,
    type AdminBranchReportItem,
} from "../actions";
import {
    getActionBadgeClass,
    getActivityActionLabel,
} from "../../activity/activity-format";
import { getReportStatusBadgeClass } from "@/lib/report-status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ branchName: string }>;
    searchParams: Promise<{ period?: string | string[] }>;
};

function normalizePeriod(value?: string | string[]) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw && /^\d{2}-\d{4}$/.test(raw)) return raw;
    return "ytd";
}

function formatNumber(value: number) {
    return value.toLocaleString("id-ID");
}

function formatShortRp(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
        notation: "compact",
        compactDisplay: "short",
    }).format(value);
}

function formatDate(date: Date | string | null) {
    if (!date) return "-";
    return formatJakartaDate(date);
}

function formatDateTime(date: Date | string | null) {
    if (!date) return "-";
    return formatJakartaDateTime(date);
}

export default async function AdminBranchDetailPage({
    params,
    searchParams,
}: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)) {
        redirect("/dashboard");
    }

    const [{ branchName }, search] = await Promise.all([
        params,
        searchParams,
    ]);
    const period = normalizePeriod(search.period);
    const detail = await getAdminBranchDetail(branchName, period);
    if (!detail) notFound();

    const branch = detail.branch;

    return (
        <AdminDashboardShell
            user={user}
            title={branch.branchName}
            breadcrumbs={[
                { label: "Performa Cabang", href: "/dashboard/branches" },
                { label: branch.branchName },
            ]}
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={period}
                    basePath={`/dashboard/branches/${encodeURIComponent(
                        branch.branchName,
                    )}`}
                />
            }
            contentClassName="h-full"
        >
            <div className="space-y-4">
                <section className="rounded-lg border bg-background">
                    <div className="grid gap-4 p-4 text-xs lg:grid-cols-3">
                        <InfoGroup
                            title="Profil Cabang"
                            icon={Store}
                            items={[
                                ["Cabang", branch.branchName],
                                ["Toko aktif", formatNumber(branch.activeStores)],
                                [
                                    "User",
                                    `${formatNumber(
                                        branch.bmsUsers,
                                    )} BMS / ${formatNumber(
                                        branch.bmcUsers,
                                    )} BMC / ${formatNumber(
                                        branch.bnmUsers,
                                    )} BNM`,
                                ],
                            ]}
                        />
                        <div className="space-y-3 lg:border-l lg:pl-4">
                            <div className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                Penyelesaian
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Progress
                                    </span>
                                    <span className="font-semibold">
                                        {branch.completionRate}%
                                    </span>
                                </div>
                                <Progress value={branch.completionRate} />
                                <div className="text-muted-foreground">
                                    {formatNumber(branch.completedCount)} selesai
                                    + PJUM dari {formatNumber(branch.reportCount)}{" "}
                                    laporan periode
                                </div>
                            </div>
                        </div>
                        <InfoGroup
                            className="lg:border-l lg:pl-4"
                            title="Risiko & Biaya"
                            icon={AlertTriangle}
                            items={[
                                [
                                    "Open report",
                                    formatNumber(branch.openReports),
                                    branch.openReports > 0
                                        ? "text-amber-700"
                                        : undefined,
                                ],
                                [
                                    "Stuck > 14 hari",
                                    formatNumber(branch.stuckReports),
                                    branch.stuckReports > 0
                                        ? "text-red-700"
                                        : undefined,
                                ],
                                [
                                    "Belum PJUM",
                                    formatNumber(branch.unpjumCompletedReports),
                                    branch.unpjumCompletedReports > 0
                                        ? "text-amber-700"
                                        : undefined,
                                ],
                                [
                                    "Realisasi",
                                    formatShortRp(branch.totalRealisasi),
                                    "text-emerald-700",
                                ],
                            ]}
                        />
                    </div>
                </section>

                <Tabs defaultValue="summary" className="gap-4">
                    <TabsList
                        variant="line"
                        className="h-auto w-full flex-wrap justify-start overflow-visible pb-2"
                    >
                        <TabsTrigger
                            value="summary"
                            className="h-8 flex-none gap-2 px-2.5 text-xs"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Ringkasan
                        </TabsTrigger>
                        <TabsTrigger
                            value="reports"
                            className="h-8 flex-none gap-2 px-2.5 text-xs"
                        >
                            <ListChecks className="h-3.5 w-3.5" />
                            Laporan Prioritas
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="h-8 flex-none gap-2 px-2.5 text-xs"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            Aktivitas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-0">
                        <div className="grid gap-4 xl:grid-cols-2">
                            <Section
                                title="Distribusi Status"
                                description="Sebaran status laporan pada periode aktif"
                            >
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {detail.status.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada laporan pada periode ini.
                                        </p>
                                    ) : (
                                        detail.status.map((item) => (
                                            <div
                                                key={item.status}
                                                className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs"
                                            >
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "font-normal",
                                                        getReportStatusBadgeClass(
                                                            item.status,
                                                        ),
                                                    )}
                                                >
                                                    {item.label}
                                                </Badge>
                                                <span className="font-mono font-semibold">
                                                    {formatNumber(item.count)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Section>

                            <Section
                                title="Top BMS"
                                description="Berdasarkan laporan selesai dan sudah PJUM"
                            >
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>BMS</TableHead>
                                            <TableHead>Selesai</TableHead>
                                            <TableHead>Realisasi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.topBms.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    Belum ada data BMS.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            detail.topBms.map((bms) => (
                                                <TableRow key={bms.nik}>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {bms.name}
                                                        </div>
                                                        <div className="font-mono text-[11px] text-muted-foreground">
                                                            {bms.nik}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatNumber(
                                                            bms.completedCount,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-emerald-700">
                                                        {formatShortRp(
                                                            bms.totalRealisasi,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Section>
                        </div>
                    </TabsContent>

                    <TabsContent value="reports" className="mt-0">
                        <div className="grid gap-4 xl:grid-cols-2">
                            <ReportListSection
                                title="Stuck Reports > 14 Hari"
                                description="Laporan aktif yang perlu dicek progresnya"
                                reports={detail.stuckReports}
                                tone="danger"
                            />
                            <ReportListSection
                                title="Completed Belum PJUM"
                                description="Laporan selesai yang perlu masuk rekap PJUM"
                                reports={detail.unpjumReports}
                                tone="warning"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0">
                        <Section
                            title="Aktivitas Terbaru"
                            description="Riwayat aktivitas terakhir pada cabang ini"
                        >
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Waktu</TableHead>
                                        <TableHead>Aktivitas</TableHead>
                                        <TableHead>Laporan</TableHead>
                                        <TableHead>Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detail.recentActivity.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                Belum ada aktivitas.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        detail.recentActivity.map((activity) => (
                                            <TableRow key={activity.id}>
                                                <TableCell>
                                                    {formatDateTime(
                                                        activity.createdAt,
                                                    )}
                                                </TableCell>
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
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Link
                                                        href={`/dashboard/reports/${activity.reportNumber}`}
                                                        className="inline-flex items-center gap-1 font-mono font-semibold text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {activity.reportNumber}
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    </Link>
                                                    <div className="text-muted-foreground">
                                                        {activity.storeName}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {activity.actorName}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Section>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminDashboardShell>
    );
}

function InfoGroup({
    title,
    icon: Icon,
    items,
    className,
}: {
    title: string;
    icon: ComponentType<{ className?: string }>;
    items: Array<[string, string, string?]>;
    className?: string;
}) {
    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </div>
            <div className="space-y-2">
                {items.map(([label, value, valueClassName]) => (
                    <div key={label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span
                            className={cn(
                                "text-right font-medium",
                                valueClassName,
                            )}
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function ReportListSection({
    title,
    description,
    reports,
    tone,
}: {
    title: string;
    description: string;
    reports: AdminBranchReportItem[];
    tone: "danger" | "warning";
}) {
    const toneClass =
        tone === "danger"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

    return (
        <Section title={title} description={description}>
            <Table className="text-xs">
                <TableHeader>
                    <TableRow className="bg-muted/40">
                        <TableHead>Laporan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Umur</TableHead>
                        <TableHead>Update</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={4}
                                className="h-24 text-center text-muted-foreground"
                            >
                                Tidak ada data.
                            </TableCell>
                        </TableRow>
                    ) : (
                        reports.map((report) => (
                            <TableRow key={report.reportNumber}>
                                <TableCell>
                                    <Link
                                        href={`/dashboard/reports/${report.reportNumber}`}
                                        className="inline-flex items-center gap-1 font-mono font-semibold text-primary underline-offset-4 hover:underline"
                                    >
                                        {report.reportNumber}
                                        <ArrowUpRight className="h-3 w-3" />
                                    </Link>
                                    <div className="text-muted-foreground">
                                        {report.storeName}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "font-normal",
                                            getReportStatusBadgeClass(
                                                report.status,
                                            ),
                                        )}
                                    >
                                        {report.statusLabel}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={toneClass}>
                                        {report.ageDays} hari
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {formatDate(report.updatedAt)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Section>
    );
}
