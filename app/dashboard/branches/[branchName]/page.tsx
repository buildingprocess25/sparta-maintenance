import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    FileText,
    ReceiptText,
    Store,
    Users,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getAuthUser } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <CardTitle className="text-2xl">{value}</CardTitle>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                </span>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

function ReportListCard({
    title,
    description,
    reports,
}: {
    title: string;
    description: string;
    reports: AdminBranchReportItem[];
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Laporan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Umur</TableHead>
                            <TableHead>Update</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Tidak ada data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map((report) => (
                                <TableRow key={report.reportNumber}>
                                    <TableCell>
                                        <div className="font-mono font-medium">
                                            {report.reportNumber}
                                        </div>
                                        <div className="text-muted-foreground">
                                            {report.storeName}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {report.statusLabel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{report.ageDays} hari</TableCell>
                                    <TableCell>
                                        {formatDate(report.updatedAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                        >
                                            <Link
                                                href={`/reports/${report.reportNumber}`}
                                                aria-label={`Buka laporan ${report.reportNumber}`}
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
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

export default async function AdminBranchDetailPage({
    params,
    searchParams,
}: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Toko Aktif"
                        value={formatNumber(branch.activeStores)}
                        description="Toko aktif di cabang ini"
                        icon={Store}
                    />
                    <SummaryCard
                        title="User"
                        value={formatNumber(
                            branch.bmsUsers + branch.bmcUsers + branch.bnmUsers,
                        )}
                        description={`BMS ${branch.bmsUsers}, BMC ${branch.bmcUsers}, BNM ${branch.bnmUsers}`}
                        icon={Users}
                    />
                    <SummaryCard
                        title="Laporan Periode"
                        value={formatNumber(branch.reportCount)}
                        description="Semua laporan non-draft sesuai periode"
                        icon={FileText}
                    />
                    <SummaryCard
                        title="Completion"
                        value={`${branch.completionRate}%`}
                        description={`${formatNumber(branch.completedCount)} selesai dan sudah PJUM`}
                        icon={CheckCircle2}
                    />
                    <SummaryCard
                        title="Open Report"
                        value={formatNumber(branch.openReports)}
                        description="Laporan aktif saat ini"
                        icon={Clock3}
                    />
                    <SummaryCard
                        title="Stuck > 14 Hari"
                        value={formatNumber(branch.stuckReports)}
                        description="Laporan aktif tanpa update lebih dari 14 hari"
                        icon={Clock3}
                    />
                    <SummaryCard
                        title="Completed Belum PJUM"
                        value={formatNumber(branch.unpjumCompletedReports)}
                        description="Laporan selesai belum masuk rekap PJUM"
                        icon={ReceiptText}
                    />
                    <SummaryCard
                        title="Total Realisasi"
                        value={formatShortRp(branch.totalRealisasi)}
                        description={`Rata-rata ${formatShortRp(branch.avgRealisasi)} per laporan`}
                        icon={Activity}
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Distribusi Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {detail.status.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Belum ada laporan pada periode ini.
                                    </p>
                                ) : (
                                    detail.status.map((item) => (
                                        <div
                                            key={item.status}
                                            className="flex items-center justify-between rounded-md border bg-white p-3 text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {item.label}
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {formatNumber(item.count)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Top BMS
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Berdasarkan laporan selesai dan sudah PJUM
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow>
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
                                                <TableCell>
                                                    {formatShortRp(
                                                        bms.totalRealisasi,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <ReportListCard
                        title="Stuck Reports > 14 Hari"
                        description="Laporan aktif yang perlu dicek progresnya"
                        reports={detail.stuckReports}
                    />
                    <ReportListCard
                        title="Completed Belum PJUM"
                        description="Laporan selesai yang perlu masuk rekap PJUM"
                        reports={detail.unpjumReports}
                    />
                </div>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Aktivitas Terbaru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
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
                                                {formatDate(activity.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {activity.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/reports/${activity.reportNumber}`}
                                                    className="font-mono font-medium text-primary hover:underline"
                                                >
                                                    {activity.reportNumber}
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
                    </CardContent>
                </Card>
            </div>
        </AdminDashboardShell>
    );
}
