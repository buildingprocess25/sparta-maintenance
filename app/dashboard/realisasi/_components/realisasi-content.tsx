import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDashboardCurrency } from "@/lib/utils";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type {
    RealisasiKpi,
    RealisasiMonthDatum,
    RealisasiBranchDatum,
} from "../queries";
import {
    RealisasiMonthlyChart,
    RealisasiBranchChart,
} from "./realisasi-charts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatShortRp(value: number): string {
    return formatDashboardCurrency(value);
}

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

// ─── Page Header ──────────────────────────────────────────────────────────────

function RealisasiHeader() {
    return (
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
                Analisis Realisasi Biaya
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
                Analisis mendalam pengeluaran biaya maintenance: tren,
                perbandingan estimasi vs aktual, dan efisiensi anggaran per
                cabang.
            </p>
        </div>
    );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCards({ kpi }: { kpi: RealisasiKpi }) {
    const isOverBudget = kpi.efficiencyPercent < 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <CardDescription>Total Realisasi</CardDescription>
                            <CardTitle className="text-2xl font-semibold">
                                {formatShortRp(kpi.totalRealisasi)}
                            </CardTitle>
                        </div>
                        <span className="rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-700">
                            <CircleDollarSign className="size-4" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Total pengeluaran seluruh cabang
                    </p>
                </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <CardDescription>
                                Rata-rata BMS / Minggu
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold">
                                {formatRp(kpi.avgBmsWeeklyRealisasi)}
                            </CardTitle>
                        </div>
                        <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700">
                            <Banknote className="size-4" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Dibanding uang muka{" "}
                        {formatShortRp(kpi.weeklyAdvanceAmount)}
                    </p>
                </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <CardDescription>
                                Efisiensi Anggaran
                            </CardDescription>
                            <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                                {Math.abs(kpi.efficiencyPercent)}%
                                {isOverBudget ? (
                                    <Badge variant="destructive">
                                        <ArrowUpRight className="size-3" />
                                        Over
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        <ArrowDownRight className="size-3" />
                                        Hemat
                                    </Badge>
                                )}
                            </CardTitle>
                        </div>
                        <span
                            className={`rounded-md border p-2 ${
                                isOverBudget
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                        >
                            <TrendingUp className="size-4" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Estimasi {formatShortRp(kpi.totalEstimasi)} vs realisasi
                    </p>
                </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <CardDescription>Laporan Selesai</CardDescription>
                            <CardTitle className="text-2xl font-semibold">
                                {formatNumber(kpi.completedCount)}
                            </CardTitle>
                        </div>
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                            <CheckCircle2 className="size-4" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Basis perhitungan realisasi
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Monthly Trend Section ────────────────────────────────────────────────────

function MonthlyTrendSection({ data }: { data: RealisasiMonthDatum[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tren Realisasi Bulanan</CardTitle>
                <CardDescription>
                    Total pengeluaran dan rata-rata realisasi BMS per minggu
                    setiap bulan
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RealisasiMonthlyChart data={data} />
            </CardContent>
        </Card>
    );
}

// ─── Branch Comparison Section ────────────────────────────────────────────────

function BranchChartSection({ data }: { data: RealisasiBranchDatum[] }) {
    if (data.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Estimasi vs Realisasi per Cabang</CardTitle>
                <CardDescription>
                    Perbandingan biaya estimasi dan aktual untuk setiap cabang.
                    Detail efisiensi cabang tetap berdasarkan laporan selesai di
                    periode filter.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RealisasiBranchChart data={data} />
            </CardContent>
        </Card>
    );
}

// ─── Branch Table Section ─────────────────────────────────────────────────────

function BranchTableSection({ data }: { data: RealisasiBranchDatum[] }) {
    const maxRealisasi = Math.max(...data.map((b) => b.totalRealisasi), 1);

    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Realisasi per Cabang</CardTitle>
                        <CardDescription>
                            Detail efisiensi anggaran setiap cabang, diurutkan
                            dari total realisasi terbesar
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cabang</TableHead>
                            <TableHead className="text-right">
                                Laporan
                            </TableHead>
                            <TableHead className="text-right">
                                Total Estimasi
                            </TableHead>
                            <TableHead className="text-right">
                                Total Realisasi
                            </TableHead>
                            <TableHead className="text-right">
                                Selisih
                            </TableHead>
                            <TableHead className="text-right">
                                BMS / Minggu
                            </TableHead>
                            <TableHead>Tren Realisasi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="text-center text-muted-foreground"
                                >
                                    Belum ada data realisasi.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((branch) => {
                                const isOver = branch.efficiencyPercent < 0;
                                return (
                                    <TableRow key={branch.branchName}>
                                        <TableCell className="font-medium">
                                            {branch.branchName}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatNumber(
                                                branch.completedCount,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {formatRp(branch.totalEstimasi)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {formatRp(branch.totalRealisasi)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono tabular-nums ${
                                                isOver
                                                    ? "text-destructive"
                                                    : "text-emerald-600"
                                            }`}
                                        >
                                            {isOver ? "" : "+"}
                                            {formatRp(branch.selisih)}
                                        </TableCell>

                                        <TableCell className="text-right font-mono tabular-nums">
                                            <div className="flex flex-col items-end gap-1">
                                                <span>
                                                    {formatRp(
                                                        branch.avgBmsWeeklyRealisasi,
                                                    )}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-32">
                                            <div className="flex w-full items-center">
                                                <Progress
                                                    value={
                                                        (branch.totalRealisasi /
                                                            maxRealisasi) *
                                                        100
                                                    }
                                                    className="w-full"
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function getAdvanceBadgeClass(usagePercent: number) {
    if (usagePercent > 100) return "border-red-200 bg-red-50 text-red-700";
    if (usagePercent >= 80)
        return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getAdvanceLabel(usagePercent: number) {
    if (usagePercent > 100) return "Kurang";
    if (usagePercent >= 80) return "Mendekati";
    return "Cukup";
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function RealisasiContent({
    kpi,
    monthly,
    branches,
    periodRaw,
}: {
    kpi: RealisasiKpi;
    monthly: RealisasiMonthDatum[];
    branches: RealisasiBranchDatum[];
    periodRaw: string;
}) {
    const isMonthlyMode = periodRaw !== "ytd";

    return (
        <>
            <RealisasiHeader />
            <KpiCards kpi={kpi} />
            {!isMonthlyMode && <MonthlyTrendSection data={monthly} />}

            <div className="flex flex-col gap-6">
                <BranchChartSection data={branches} />
                <BranchTableSection data={branches} />
            </div>
        </>
    );
}
