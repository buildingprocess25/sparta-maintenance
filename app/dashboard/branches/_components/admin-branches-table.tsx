"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowUpRight,
    Search,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
    AdminBranchesData,
    AdminBranchRow,
} from "../actions";

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

function branchDetailHref(branchName: string) {
    return `/dashboard/branches/${encodeURIComponent(branchName)}`;
}

export function AdminBranchesTable({ data }: { data: AdminBranchesData }) {
    const [search, setSearch] = useState("");

    const visibleBranches = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return data.branches;
        return data.branches.filter((branch) =>
            branch.branchName.toLowerCase().includes(query),
        );
    }, [data.branches, search]);

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Menampilkan{" "}
                    <span className="font-medium text-foreground">
                        {formatNumber(visibleBranches.length)}
                    </span>{" "}
                    cabang
                </div>
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari cabang..."
                        className="h-8 bg-white pl-8 text-xs"
                    />
                </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="w-full overflow-x-auto">
                    <Table className="text-xs [&_td]:py-2 [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="min-w-[180px]">
                                    Cabang
                                </TableHead>
                                <TableHead>Toko</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Laporan</TableHead>
                                <TableHead className="min-w-[150px]">
                                    Completion
                                </TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead>Stuck</TableHead>
                                <TableHead>Belum PJUM</TableHead>
                                <TableHead>Realisasi</TableHead>
                                <TableHead>Aktivitas</TableHead>
                                <TableHead className="w-[80px] text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleBranches.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={11}
                                        className="h-32 text-center text-sm text-muted-foreground"
                                    >
                                        Tidak ada cabang sesuai pencarian.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleBranches.map((branch: AdminBranchRow) => (
                                    <TableRow key={branch.branchName}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {branch.branchName}
                                            </div>
                                            <div className="text-muted-foreground">
                                                Avg {formatShortRp(branch.avgRealisasi)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatNumber(branch.activeStores)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="outline">
                                                    BMS {branch.bmsUsers}
                                                </Badge>
                                                <Badge variant="outline">
                                                    BMC {branch.bmcUsers}
                                                </Badge>
                                                <Badge variant="outline">
                                                    BNM {branch.bnmUsers}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatNumber(branch.reportCount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex min-w-32 items-center gap-2">
                                                <Progress
                                                    value={branch.completionRate}
                                                />
                                                <span className="w-10 text-muted-foreground">
                                                    {branch.completionRate}%
                                                </span>
                                            </div>
                                            <div className="text-muted-foreground">
                                                {formatNumber(
                                                    branch.completedCount,
                                                )}{" "}
                                                selesai + PJUM
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatNumber(branch.openReports)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    branch.stuckReports > 0
                                                        ? "border-red-200 bg-red-50 text-red-700"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                }
                                            >
                                                {formatNumber(
                                                    branch.stuckReports,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatNumber(
                                                branch.unpjumCompletedReports,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatShortRp(
                                                branch.totalRealisasi,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(branch.lastActivityAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                            >
                                                <Link
                                                    href={branchDetailHref(
                                                        branch.branchName,
                                                    )}
                                                    aria-label={`Buka detail ${branch.branchName}`}
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
                </div>
            </div>
        </div>
    );
}
