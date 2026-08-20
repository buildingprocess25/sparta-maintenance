import Link from "next/link";
import type { ElementType } from "react";
import { redirect } from "next/navigation";
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    TimerReset,
    UserRound,
    Wallet,
    ChevronLeft,
} from "lucide-react";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { getAuthUser } from "@/lib/authorization";
import { cn, formatDashboardCurrency } from "@/lib/utils";
import { formatJakartaDateTime } from "@/lib/time";
import { BmsPerformanceChart } from "./_components/bms-performance-chart";
import { BmsPerformancePeriodFilter } from "./_components/bms-performance-period-filter";
import {
    getBmsPerformanceData,
    type BmsAttentionItem,
    type BmsPerformanceFilters as BmsPerformanceFilterValues,
    type BmsPerformanceRow,
} from "./actions";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
    return value.toLocaleString("id-ID");
}

function formatRp(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatShortRp(value: number) {
    return formatDashboardCurrency(value);
}

function formatDateTime(date: Date | null) {
    if (!date) return "-";
    return formatJakartaDateTime(date);
}

function formatDuration(hours: number | null) {
    if (hours === null) return "-";
    if (hours < 24) return `${Math.max(1, Math.round(hours))} jam`;
    const days = hours / 24;
    return `${Number.isInteger(days) ? days : days.toFixed(1)} hari`;
}

function formatAdvanceUsage(value: number, advance: number) {
    if (advance <= 0) return "-";
    return `${Math.round((value / advance) * 100)}% dari uang muka`;
}

function MetricCard({
    title,
    value,
    helper,
    icon: Icon,
    tone = "slate",
}: {
    title: string;
    value: string;
    helper: string;
    icon: ElementType;
    tone?: "slate" | "blue" | "green" | "amber" | "red";
}) {
    const toneClass = {
        slate: "bg-muted text-muted-foreground",
        blue: "bg-sky-50 text-sky-700",
        green: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
    }[tone];

    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                    {title}
                </CardTitle>
                <CardAction>
                    <span
                        className={cn(
                            "flex size-8 items-center justify-center rounded-md",
                            toneClass,
                        )}
                    >
                        <Icon className="size-4" />
                    </span>
                </CardAction>
                <CardDescription className="text-2xl font-semibold tracking-tight text-foreground">
                    {value}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground">{helper}</div>
            </CardContent>
        </Card>
    );
}

function BmsPerformanceKpis({
    kpi,
}: {
    kpi: Awaited<ReturnType<typeof getBmsPerformanceData>>["kpi"];
}) {
    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
                title="BMS"
                value={formatNumber(kpi.totalBms)}
                helper="User BMS pada cabang scope Anda"
                icon={UserRound}
                tone="blue"
            />
            <MetricCard
                title="Laporan Aktif"
                value={formatNumber(kpi.activeReports)}
                helper="Belum selesai dan masih perlu dipantau"
                icon={Activity}
                tone={kpi.activeReports > 0 ? "amber" : "green"}
            />
            <MetricCard
                title="Selesai"
                value={formatNumber(kpi.completedReports)}
                helper="Final BNM pada periode aktif"
                icon={CheckCircle2}
                tone="green"
            />
            <MetricCard
                title="Rata-rata Selesai"
                value={formatDuration(kpi.avgCompletionHours)}
                helper="Durasi dari laporan dibuat sampai final BNM"
                icon={TimerReset}
                tone="blue"
            />
            <MetricCard
                title="BMS / Minggu"
                value={formatShortRp(kpi.avgWeeklyRealisasi)}
                helper={formatAdvanceUsage(
                    kpi.avgWeeklyRealisasi,
                    kpi.weeklyAdvanceAmount,
                )}
                icon={Wallet}
                tone={
                    kpi.avgWeeklyRealisasi > kpi.weeklyAdvanceAmount
                        ? "red"
                        : "slate"
                }
            />
        </section>
    );
}

function BmsPerformanceAttentionGroup({
    title,
    items,
    empty,
}: {
    title: string;
    items: BmsAttentionItem[];
    empty: string;
}) {
    const toneClass: Record<BmsAttentionItem["tone"], string> = {
        red: "border-red-200 bg-red-50 text-red-700",
        amber: "border-amber-200 bg-amber-50 text-amber-700",
        blue: "border-sky-200 bg-sky-50 text-sky-700",
        slate: "border-border bg-muted text-muted-foreground",
    };

    return (
        <div className="min-w-0 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {title}
            </div>
            <div className="space-y-1">
                {items.length === 0 ? (
                    <div className="rounded-md border border-dashed px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        {empty}
                    </div>
                ) : (
                    items.map((item) => (
                        <Link
                            key={`${title}-${item.nik}`}
                            href={item.href}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-muted/40"
                        >
                            <span className="min-w-0">
                                <span className="block truncate font-medium">
                                    {item.name}
                                </span>
                                <span className="block truncate text-muted-foreground">
                                    {item.helper}
                                </span>
                            </span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "self-start",
                                    toneClass[item.tone],
                                )}
                            >
                                {item.value}
                            </Badge>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

function countAttentionItems(
    attention: Awaited<ReturnType<typeof getBmsPerformanceData>>["attention"],
) {
    return Object.values(attention).reduce(
        (sum, items) => sum + items.length,
        0,
    );
}

function BmsAttentionDrawer({
    attention,
}: {
    attention: Awaited<ReturnType<typeof getBmsPerformanceData>>["attention"];
}) {
    const totalAttention = countAttentionItems(attention);
    const hasAttention = totalAttention > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                    <ChevronLeft data-icon="inline-start" />
                    <span className="hidden sm:inline">Perlu Perhatian</span>
                    {hasAttention ? (
                        <Badge variant="outline">{totalAttention}</Badge>
                    ) : null}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Perlu Perhatian</SheetTitle>
                    <SheetDescription>
                        BMS yang perlu dicek lebih dulu pada periode aktif.
                    </SheetDescription>
                </SheetHeader>
                <div className="no-scrollbar grid gap-3 overflow-y-auto px-4 pb-4">
                    <BmsPerformanceAttentionGroup
                        title="Aktif terlama"
                        items={attention.oldestActive}
                        empty="Tidak ada laporan aktif."
                    />
                    <BmsPerformanceAttentionGroup
                        title="Lewat SLA"
                        items={attention.overdue}
                        empty="Tidak ada laporan lewat SLA."
                    />
                    <BmsPerformanceAttentionGroup
                        title="Uang muka"
                        items={attention.highAdvance}
                        empty="Rata-rata masih aman."
                    />
                    <BmsPerformanceAttentionGroup
                        title="Revisi"
                        items={attention.revision}
                        empty="Tidak ada revisi tinggi."
                    />
                    <BmsPerformanceAttentionGroup
                        title="Aktivitas hari ini"
                        items={attention.inactiveToday}
                        empty="Semua BMS aktif hari ini."
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function BmsTrendSection({
    data,
    attention,
}: {
    data: Awaited<ReturnType<typeof getBmsPerformanceData>>["trend"];
    attention: Awaited<ReturnType<typeof getBmsPerformanceData>>["attention"];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tren Realisasi Mingguan</CardTitle>
                <CardDescription>
                    Bar menampilkan total realisasi. Garis menampilkan rata-rata
                    realisasi per BMS per minggu.
                </CardDescription>
                <CardAction>
                    <BmsAttentionDrawer attention={attention} />
                </CardAction>
            </CardHeader>
            <CardContent>
                <BmsPerformanceChart data={data} />
            </CardContent>
        </Card>
    );
}

function getUsageBadgeClass(value: number, advance: number) {
    if (advance <= 0) return "border-border text-muted-foreground";
    const usage = value / advance;
    if (usage > 1) return "border-red-200 bg-red-50 text-red-700";
    if (usage >= 0.75) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function BmsPerformanceTable({
    rows,
    weeklyAdvanceAmount,
}: {
    rows: BmsPerformanceRow[];
    weeklyAdvanceAmount: number;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Daftar BMS</CardTitle>
                <CardDescription>
                    Klik NIK BMS untuk membuka detail.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[180px]">BMS</TableHead>
                            <TableHead className="text-right">
                                Laporan Aktif
                            </TableHead>
                            <TableHead className="text-right">
                                Selesai
                            </TableHead>
                            <TableHead className="text-right">
                                Lewat SLA
                            </TableHead>
                            <TableHead className="w-[132px] text-right">
                                Total Realisasi
                            </TableHead>
                            <TableHead className="min-w-[160px] text-right">
                                BMS / Minggu
                            </TableHead>
                            <TableHead className="min-w-[130px] text-right">
                                Rata-rata Selesai
                            </TableHead>
                            <TableHead className="min-w-[140px] text-right">
                                Sudah PJUM
                            </TableHead>
                            <TableHead className="min-w-[150px]">
                                Update
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Belum ada BMS pada cabang scope Anda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.nik}>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/bms-performance/${row.nik}`}
                                            className="inline-flex items-center gap-1 font-mono font-semibold text-primary underline-offset-4 hover:underline"
                                        >
                                            {row.nik}
                                            <ArrowUpRight className="size-3" />
                                        </Link>
                                        <div className="text-muted-foreground">
                                            {row.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatNumber(row.activeReports)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold text-emerald-700">
                                        {formatNumber(row.completedReports)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant="outline"
                                            className={
                                                row.overdueReports > 0
                                                    ? "border-red-200 bg-red-50 text-red-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }
                                        >
                                            {row.overdueReports > 0
                                                ? `${formatNumber(
                                                      row.overdueReports,
                                                  )} laporan`
                                                : "Aman"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-semibold">
                                            {formatRp(row.totalRealisasi)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-semibold">
                                            {formatRp(row.avgWeeklyRealisasi)}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={getUsageBadgeClass(
                                                row.avgWeeklyRealisasi,
                                                weeklyAdvanceAmount,
                                            )}
                                        >
                                            {formatAdvanceUsage(
                                                row.avgWeeklyRealisasi,
                                                weeklyAdvanceAmount,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatDuration(row.avgCompletionHours)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="font-mono font-semibold">
                                            {formatNumber(row.pjumReports)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDateTime(row.lastActivityAt)}
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

function getSearchParam(
    value: string | string[] | undefined,
): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

type Props = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BmsPerformancePage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["BMC", "BNM_MANAGER"].includes(user.role)) redirect("/dashboard");

    const params = (await searchParams) ?? {};
    const filters: BmsPerformanceFilterValues = {
        period: getSearchParam(params.period),
    };
    const data = await getBmsPerformanceData(filters);

    return (
        <AdminDashboardShell
            user={user}
            title="Performa BMS"
            breadcrumbs={[{ label: "Performa BMS" }]}
            contentClassName="h-full"
            headerActions={
                <BmsPerformancePeriodFilter
                    initialPeriod={data.filters.period}
                />
            }
        >
            <BmsPerformanceKpis kpi={data.kpi} />
            <BmsTrendSection data={data.trend} attention={data.attention} />
            <BmsPerformanceTable
                rows={data.rows}
                weeklyAdvanceAmount={data.kpi.weeklyAdvanceAmount}
            />
        </AdminDashboardShell>
    );
}
