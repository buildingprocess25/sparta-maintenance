"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Clock3,
    ListTree,
    ReceiptText,
    Store,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatJakartaDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { AdminBranchesData, AdminBranchRow } from "../actions";
import { cn } from "@/lib/utils";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

type BranchViewFilter = "all" | "attention" | "unpjum" | "strong";

const VIEW_FILTERS: Array<{
    value: BranchViewFilter;
    label: string;
    predicate: (branch: AdminBranchRow) => boolean;
}> = [
    { value: "all", label: "Semua", predicate: () => true },
    {
        value: "attention",
        label: "Perlu perhatian",
        predicate: (branch) => branch.stuckReports > 0 || branch.openReports > 0,
    },
    {
        value: "unpjum",
        label: "Belum PJUM",
        predicate: (branch) => branch.unpjumCompletedReports > 0,
    },
    {
        value: "strong",
        label: "Performa baik",
        predicate: (branch) =>
            branch.reportCount > 0 &&
            branch.completionRate >= 80 &&
            branch.stuckReports === 0,
    },
];

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

function branchDetailHref(branchName: string, brand: StoreBrandFilter) {
    const href = `/dashboard/branches/${encodeURIComponent(branchName)}`;
    return brand === "ALL" ? href : `${href}?brand=${brand}`;
}

function getHealthLabel(branch: AdminBranchRow) {
    if (branch.stuckReports > 0) return "Stuck";
    if (branch.openReports > 0) return "Aktif";
    if (branch.reportCount === 0) return "Belum ada laporan";
    return "Stabil";
}

function getHealthClass(branch: AdminBranchRow) {
    if (branch.stuckReports > 0) {
        return "border-red-200 bg-red-50 text-red-700";
    }
    if (branch.openReports > 0) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (branch.reportCount === 0) {
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function AdminBranchesTable({
    data,
    brand,
}: {
    data: AdminBranchesData;
    brand: StoreBrandFilter;
}) {
    const [viewFilter, setViewFilter] = useState<BranchViewFilter>("all");

    const filteredBranches = useMemo(() => {
        const activePredicate =
            VIEW_FILTERS.find((item) => item.value === viewFilter)?.predicate ??
            VIEW_FILTERS[0].predicate;

        return data.branches.filter(activePredicate);
    }, [data.branches, viewFilter]);

    const rankings = useMemo(() => {
        const branches = [...data.branches];
        return {
            attention: branches
                .filter((branch) => branch.stuckReports > 0 || branch.openReports > 0)
                .sort(
                    (a, b) =>
                        b.stuckReports - a.stuckReports ||
                        b.openReports - a.openReports,
                )
                .slice(0, 5),
            unpjum: branches
                .filter((branch) => branch.unpjumCompletedReports > 0)
                .sort(
                    (a, b) =>
                        b.unpjumCompletedReports -
                        a.unpjumCompletedReports,
                )
                .slice(0, 5),
            realisasi: branches
                .filter((branch) => branch.totalRealisasi > 0)
                .sort((a, b) => b.totalRealisasi - a.totalRealisasi)
                .slice(0, 5),
        };
    }, [data.branches]);

    const filterCounts = useMemo(() => {
        return new Map(
            VIEW_FILTERS.map((filter) => [
                filter.value,
                data.branches.filter(filter.predicate).length,
            ]),
        );
    }, [data.branches]);

    return (
        <div className="min-w-0 space-y-6">
            <section className="space-y-3">
                <SectionTitle
                    icon={BarChart3}
                    title="Ringkasan Cabang"
                    description="Prioritas operasional, PJUM tertunda, dan cabang dengan realisasi terbesar."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                    <RankingPanel
                        title="Prioritas Operasional"
                        description="Cabang dengan stuck/open tertinggi"
                        icon={AlertTriangle}
                    rows={rankings.attention}
                    brand={brand}
                    emptyLabel="Tidak ada cabang prioritas."
                    valueClassName="bg-red-50 text-red-700"
                    value={(branch) =>
                        `${formatNumber(branch.stuckReports)} stuck / ${formatNumber(
                            branch.openReports,
                            )} open`
                        }
                    />
                    <RankingPanel
                        title="Belum PJUM"
                        description="Laporan selesai yang belum masuk PJUM"
                        icon={ReceiptText}
                    rows={rankings.unpjum}
                    brand={brand}
                    emptyLabel="Tidak ada completed belum PJUM."
                    valueClassName="bg-amber-50 text-amber-700"
                    value={(branch) =>
                        `${formatNumber(
                            branch.unpjumCompletedReports,
                            )} laporan`
                        }
                    />
                    <RankingPanel
                        title="Realisasi Terbesar"
                        description="Cabang dengan biaya realisasi tertinggi"
                        icon={CheckCircle2}
                    rows={rankings.realisasi}
                    brand={brand}
                    emptyLabel="Belum ada realisasi pada periode ini."
                    valueClassName="bg-emerald-50 text-emerald-700"
                        value={(branch) => formatShortRp(branch.totalRealisasi)}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <SectionTitle
                    icon={ListTree}
                    title="Daftar Cabang"
                    description="Tabel performa semua cabang sesuai periode aktif."
                />
                <div className="min-w-0 space-y-4">
                    <div className="space-y-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-muted-foreground">
                                Total{" "}
                                <span className="font-medium text-foreground">
                                    {formatNumber(filteredBranches.length)}
                                </span>{" "}
                                cabang sesuai filter
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            <div className="flex flex-wrap gap-2">
                                {VIEW_FILTERS.map((filter) => (
                                    <Button
                                        key={filter.value}
                                        type="button"
                                        variant={
                                            viewFilter === filter.value
                                                ? "default"
                                                : "outline"
                                        }
                                        size="xs"
                                        onClick={() =>
                                            setViewFilter(filter.value)
                                        }
                                    >
                                        {filter.label} (
                                        {formatNumber(
                                            filterCounts.get(filter.value) ?? 0,
                                        )}
                                        )
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
                        <div className="w-full overflow-x-auto">
                            <Table className="text-xs [&_td]:py-2 [&_th]:py-2">
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="min-w-[210px]">
                                            Cabang
                                        </TableHead>
                                        <TableHead className="min-w-[140px]">
                                            Operasional
                                        </TableHead>
                                        <TableHead className="min-w-[190px]">
                                            Laporan Periode
                                        </TableHead>
                                        <TableHead className="min-w-[150px]">
                                            Risiko Aktif
                                        </TableHead>
                                        <TableHead className="w-[120px]">
                                            Belum PJUM
                                        </TableHead>
                                        <TableHead className="min-w-[150px]">
                                            Realisasi
                                        </TableHead>
                                        <TableHead className="min-w-[130px]">
                                            Aktivitas
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBranches.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="h-32 text-center text-sm text-muted-foreground"
                                            >
                                                Tidak ada cabang sesuai filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBranches.map((branch) => (
                                            <BranchRow
                                                key={branch.branchName}
                                                branch={branch}
                                                brand={brand}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function SectionTitle({
    icon: Icon,
    title,
    description,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="border-b pb-2">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

function BranchRow({
    branch,
    brand,
}: {
    branch: AdminBranchRow;
    brand: StoreBrandFilter;
}) {
    return (
        <TableRow
            className={cn(
                "align-top",
                branch.stuckReports > 0 && "bg-red-50/35",
            )}
        >
            <TableCell>
                <Link
                    href={branchDetailHref(branch.branchName, brand)}
                    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                >
                    {branch.branchName}
                    <ArrowUpRight className="h-3 w-3" />
                </Link>
                <div className="mt-1">
                    <Badge
                        variant="outline"
                        className={cn("font-normal", getHealthClass(branch))}
                    >
                        {getHealthLabel(branch)}
                    </Badge>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <MetricLine
                        icon={Store}
                        label="Toko"
                        value={formatNumber(branch.activeStores)}
                    />
                    <MetricLine
                        icon={Users}
                        label="User"
                        value={`${formatNumber(
                            branch.bmsUsers,
                        )} BMS / ${formatNumber(branch.bmcUsers)} BMC`}
                    />
                </div>
            </TableCell>
            <TableCell>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                            {formatNumber(branch.completedCount)} dari{" "}
                            {formatNumber(branch.reportCount)}
                        </span>
                        <span className="font-semibold">
                            {branch.completionRate}%
                        </span>
                    </div>
                    <Progress value={branch.completionRate} />
                    <div className="text-[11px] text-muted-foreground">
                        selesai dan sudah PJUM
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                        <Clock3 className="mr-1 h-3 w-3" />
                        Open {formatNumber(branch.openReports)}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={
                            branch.stuckReports > 0
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }
                    >
                        Stuck {formatNumber(branch.stuckReports)}
                    </Badge>
                </div>
            </TableCell>
            <TableCell>
                <span
                    className={cn(
                        "font-semibold",
                        branch.unpjumCompletedReports > 0
                            ? "text-amber-700"
                            : "text-muted-foreground",
                    )}
                >
                    {formatNumber(branch.unpjumCompletedReports)}
                </span>
            </TableCell>
            <TableCell>
                <div className="font-semibold">
                    {formatShortRp(branch.totalRealisasi)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                    Avg {formatShortRp(branch.avgRealisasi)}
                </div>
            </TableCell>
            <TableCell>{formatDate(branch.lastActivityAt)}</TableCell>
        </TableRow>
    );
}

function MetricLine({
    icon: Icon,
    label,
    value,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className="font-medium text-foreground">{value}</span>
        </div>
    );
}

function RankingPanel({
    title,
    description,
    icon: Icon,
    rows,
    emptyLabel,
    value,
    valueClassName,
    brand,
}: {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    rows: AdminBranchRow[];
    emptyLabel: string;
    value: (branch: AdminBranchRow) => string;
    valueClassName: string;
    brand: StoreBrandFilter;
}) {
    return (
        <section className="rounded-lg border bg-background">
            <div className="flex items-start gap-3 border-b px-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <div className="divide-y">
                {rows.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                        {emptyLabel}
                    </p>
                ) : (
                    rows.map((branch, index) => (
                        <Link
                            key={branch.branchName}
                            href={branchDetailHref(branch.branchName, brand)}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-muted/40"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                    <span className="truncate font-medium text-primary">
                                        {branch.branchName}
                                    </span>
                                    <ArrowUpRight className="h-3 w-3 shrink-0 text-primary" />
                                </div>
                                <div className="mt-0.5 text-muted-foreground">
                                    {formatNumber(branch.reportCount)} laporan
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "shrink-0 rounded-md px-2 py-1 font-semibold",
                                    valueClassName,
                                )}
                            >
                                {value(branch)}
                            </span>
                        </Link>
                    ))
                )}
            </div>
        </section>
    );
}
