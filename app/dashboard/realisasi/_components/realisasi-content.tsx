import Link from "next/link";
import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    TrendingUp,
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
import type {
    RealisasiKpi,
    RealisasiMonthDatum,
    RealisasiBranchDatum,
    RealisasiPeriod,
} from "../queries";
import {
    RealisasiMonthlyChart,
    RealisasiBranchChart,
} from "./realisasi-charts";
import { BranchFilterSelect } from "./branch-filter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

// ─── Period Options ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: RealisasiPeriod; label: string }[] = [
    { value: "ytd", label: "YTD" },
    { value: "30d", label: "30 Hari" },
    { value: "90d", label: "90 Hari" },
    { value: "12m", label: "12 Bulan" },
];

// ─── Page Header ──────────────────────────────────────────────────────────────

function RealisasiHeader() {
    return (
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
                Analisis Realisasi Biaya
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
                Analisis mendalam pengeluaran biaya maintenance: tren, perbandingan
                estimasi vs aktual, dan efisiensi anggaran per cabang.
            </p>
        </div>
    );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function RealisasiFilters({
    period,
    branch,
    branches,
}: {
    period: RealisasiPeriod;
    branch: string;
    branches: string[];
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Period filter */}
            <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => (
                    <Button
                        key={option.value}
                        asChild
                        size="sm"
                        variant={
                            period === option.value ? "default" : "outline"
                        }
                    >
                        <Link
                            href={`/dashboard/realisasi?period=${option.value}${branch !== "all" ? `&branch=${encodeURIComponent(branch)}` : ""}`}
                        >
                            {option.label}
                        </Link>
                    </Button>
                ))}
            </div>

            {/* Branch filter */}
            <BranchFilterSelect
                period={period}
                branch={branch}
                branches={branches}
            />
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
                                Rata-rata per Laporan
                            </CardDescription>
                            <CardTitle className="text-2xl font-semibold">
                                {formatRp(kpi.avgPerReport)}
                            </CardTitle>
                        </div>
                        <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700">
                            <Banknote className="size-4" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Biaya realisasi rata-rata
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
                        Estimasi{" "}
                        {formatShortRp(kpi.totalEstimasi)} vs realisasi
                    </p>
                </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <CardDescription>
                                Laporan Selesai
                            </CardDescription>
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
                    Total pengeluaran dan rata-rata per laporan setiap bulan
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
                    Perbandingan biaya estimasi dan aktual untuk setiap cabang
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
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/reports">
                            Detail
                            <ArrowUpRight className="size-4" />
                        </Link>
                    </Button>
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
                            <TableHead>Efisiensi</TableHead>
                            <TableHead className="text-right">
                                Rata-rata
                            </TableHead>
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
                                            {formatShortRp(
                                                branch.totalEstimasi,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {formatShortRp(
                                                branch.totalRealisasi,
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono tabular-nums ${
                                                isOver
                                                    ? "text-destructive"
                                                    : "text-emerald-600"
                                            }`}
                                        >
                                            {isOver ? "" : "+"}
                                            {formatShortRp(branch.selisih)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex min-w-24 items-center gap-2">
                                                <Progress
                                                    value={Math.max(
                                                        0,
                                                        Math.min(
                                                            100,
                                                            branch.efficiencyPercent +
                                                                50,
                                                        ),
                                                    )}
                                                />
                                                <span
                                                    className={`w-12 text-xs tabular-nums ${
                                                        isOver
                                                            ? "text-destructive"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {branch.efficiencyPercent}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {formatShortRp(
                                                branch.avgRealisasi,
                                            )}
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

// ─── Main Export ───────────────────────────────────────────────────────────────

export function RealisasiContent({
    kpi,
    monthly,
    branches,
    period,
    branchFilter,
    allBranches,
}: {
    kpi: RealisasiKpi;
    monthly: RealisasiMonthDatum[];
    branches: RealisasiBranchDatum[];
    period: RealisasiPeriod;
    branchFilter: string;
    allBranches: string[];
}) {
    return (
        <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <RealisasiHeader />
                <RealisasiFilters
                    period={period}
                    branch={branchFilter}
                    branches={allBranches}
                />
            </div>

            <KpiCards kpi={kpi} />
            <MonthlyTrendSection data={monthly} />

            <div className="grid gap-6 xl:grid-cols-2">
                <BranchChartSection data={branches} />
                <BranchTableSection data={branches} />
            </div>
        </>
    );
}
