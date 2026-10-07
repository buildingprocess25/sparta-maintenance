"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronRight,
    Search,
    CheckCircle2,
    Clock,
    Users,
    Store,
    ExternalLink,
} from "lucide-react";
import type { BranchCoverageHierarchy } from "../coverage-hierarchy-action";

type Props = {
    initialHierarchy: BranchCoverageHierarchy[];
    defaultBranch?: string;
    isBmc?: boolean;
    quarter?: number;
    year?: number;
};

export function BmsCoverageHierarchyTable({
    initialHierarchy,
    defaultBranch,
    isBmc = false,
    quarter,
    year,
}: Props) {
    const [search, setSearch] = useState("");

    // Set cabang yang di-expand
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (isBmc && defaultBranch && defaultBranch !== "all") {
            initial.add(defaultBranch);
        } else if (initialHierarchy.length === 1) {
            initial.add(initialHierarchy[0].branchName);
        }
        return initial;
    });

    // Set BMS yang di-expand
    const [expandedBms, setExpandedBms] = useState<Set<string>>(new Set());

    // Filter toko lokal per BMS
    const [storeSearchByBms, setStoreSearchByBms] = useState<Record<string, string>>({});

    const toggleBranch = (branchName: string) => {
        setExpandedBranches((prev) => {
            const next = new Set(prev);
            if (next.has(branchName)) {
                next.delete(branchName);
            } else {
                next.add(branchName);
            }
            return next;
        });
    };

    const toggleBms = (bmsNik: string) => {
        setExpandedBms((prev) => {
            const next = new Set(prev);
            if (next.has(bmsNik)) {
                next.delete(bmsNik);
            } else {
                next.add(bmsNik);
            }
            return next;
        });
    };

    const filteredHierarchy = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return initialHierarchy;

        return initialHierarchy
            .map((branch) => {
                const branchMatch = branch.branchName.toLowerCase().includes(query);

                const matchedBmsList = branch.bmsList
                    .map((bms) => {
                        const bmsMatch =
                            bms.name.toLowerCase().includes(query) ||
                            bms.nik.toLowerCase().includes(query);

                        const matchedStores = bms.stores.filter(
                            (s) =>
                                s.storeName.toLowerCase().includes(query) ||
                                s.storeCode.toLowerCase().includes(query),
                        );

                        if (bmsMatch || branchMatch || matchedStores.length > 0) {
                            return {
                                ...bms,
                                stores:
                                    matchedStores.length > 0 && !bmsMatch && !branchMatch
                                        ? matchedStores
                                        : bms.stores,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean) as typeof branch.bmsList;

                if (branchMatch || matchedBmsList.length > 0) {
                    return {
                        ...branch,
                        bmsList: matchedBmsList,
                    };
                }
                return null;
            })
            .filter(Boolean) as BranchCoverageHierarchy[];
    }, [initialHierarchy, search]);

    return (
        <div className="space-y-4">
            {/* Toolbar Filter & Quick Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                        placeholder="Cari cabang, nama BMS, NIK, atau nama/kode toko..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-9 text-xs"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => {
                            if (expandedBranches.size === initialHierarchy.length) {
                                setExpandedBranches(new Set());
                                setExpandedBms(new Set());
                            } else {
                                setExpandedBranches(new Set(initialHierarchy.map((b) => b.branchName)));
                            }
                        }}
                    >
                        {expandedBranches.size === initialHierarchy.length
                            ? "Ciutkan Semua Cabang"
                            : "Bentangkan Semua Cabang"}
                    </Button>
                </div>
            </div>

            {/* Hierarchical Table */}
            <div className="rounded-md border bg-card overflow-hidden shadow-sm">
                <Table className="text-xs">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[320px] font-semibold text-slate-700 dark:text-slate-300">
                                Unit Kerja / Cabang / BMS
                            </TableHead>
                            <TableHead className="w-[120px] text-center font-semibold text-slate-700 dark:text-slate-300">
                                Target Toko
                            </TableHead>
                            <TableHead className="w-[120px] text-center font-semibold text-slate-700 dark:text-slate-300">
                                Sudah Checklist
                            </TableHead>
                            <TableHead className="w-[120px] text-center font-semibold text-slate-700 dark:text-slate-300">
                                Belum Checklist
                            </TableHead>
                            <TableHead className="w-[200px] font-semibold text-slate-700 dark:text-slate-300">
                                Pencapaian Coverage
                            </TableHead>
                            <TableHead className="w-[80px] text-center font-semibold text-slate-700 dark:text-slate-300">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHierarchy.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-32 text-center text-muted-foreground"
                                >
                                    Tidak ada data coverage BMS yang cocok dengan kriteria filter
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHierarchy.map((branch) => {
                                const isBranchExpanded =
                                    expandedBranches.has(branch.branchName) || !!search.trim();

                                return (
                                    <div key={branch.branchName} className="contents">
                                        {/* LEVEL 1: Baris Cabang */}
                                        <TableRow
                                            className="bg-slate-50/70 hover:bg-slate-100/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 cursor-pointer border-b transition-colors font-medium"
                                            onClick={() => toggleBranch(branch.branchName)}
                                        >
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight
                                                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                                                            isBranchExpanded ? "rotate-90 text-primary" : ""
                                                        }`}
                                                    />
                                                    <Store className="w-4 h-4 text-primary" />
                                                    <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
                                                        {branch.branchName}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-2 font-normal text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 gap-1"
                                                    >
                                                        <Users className="w-3 h-3" />
                                                        {branch.bmsCount} BMS
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-sm">
                                                {branch.totalStores}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-sm text-emerald-600">
                                                {branch.completedStores}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-sm text-amber-600">
                                                {branch.pendingStores}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-xs font-semibold">
                                                        <span>{branch.coverageRate}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${
                                                                branch.coverageRate >= 100
                                                                    ? "bg-emerald-500"
                                                                    : branch.coverageRate >= 50
                                                                      ? "bg-blue-500"
                                                                      : "bg-amber-500"
                                                            }`}
                                                            style={{
                                                                width: `${Math.min(100, branch.coverageRate)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs px-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleBranch(branch.branchName);
                                                    }}
                                                >
                                                    {isBranchExpanded ? "Tutup" : "Lihat"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>

                                        {/* LEVEL 2: Daftar BMS di dalam Cabang */}
                                        {isBranchExpanded &&
                                            branch.bmsList.map((bms) => {
                                                const isBmsExpanded =
                                                    expandedBms.has(bms.nik) || !!search.trim();
                                                const bmsStoreFilter =
                                                    storeSearchByBms[bms.nik]?.toLowerCase() || "";

                                                const displayedStores = bmsStoreFilter
                                                    ? bms.stores.filter(
                                                          (s) =>
                                                              s.storeName
                                                                  .toLowerCase()
                                                                  .includes(bmsStoreFilter) ||
                                                              s.storeCode
                                                                  .toLowerCase()
                                                                  .includes(bmsStoreFilter),
                                                      )
                                                    : bms.stores;

                                                return (
                                                    <div key={bms.nik} className="contents">
                                                        <TableRow
                                                            className="bg-white/80 dark:bg-slate-950/80 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer border-b"
                                                            onClick={() => toggleBms(bms.nik)}
                                                        >
                                                            <TableCell className="py-2.5 pl-8">
                                                                <div className="flex items-center gap-2">
                                                                    <ChevronRight
                                                                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                                                            isBmsExpanded
                                                                                ? "rotate-90 text-blue-600"
                                                                                : ""
                                                                        }`}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                            {bms.name}
                                                                        </span>
                                                                        <span className="text-[11px] font-mono text-muted-foreground">
                                                                            NIK: {bms.nik}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {bms.totalStores}
                                                            </TableCell>
                                                            <TableCell className="text-center text-emerald-600 font-medium">
                                                                {bms.completedStores}
                                                            </TableCell>
                                                            <TableCell className="text-center text-amber-600 font-medium">
                                                                {bms.pendingStores}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs ${
                                                                        bms.kpiRate >= 100
                                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                            : bms.kpiRate >= 50
                                                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                                                    }`}
                                                                >
                                                                    Pencapaian: {bms.kpiRate}%
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 text-[11px] px-2"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleBms(bms.nik);
                                                                    }}
                                                                >
                                                                    {isBmsExpanded
                                                                        ? "Tutup Toko"
                                                                        : `Toko (${bms.totalStores})`}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* LEVEL 3: Rincian Toko Coverage di bawah BMS */}
                                                        {isBmsExpanded && (
                                                            <TableRow className="bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50/40">
                                                                <TableCell colSpan={6} className="p-3 pl-12 pr-6">
                                                                    <div className="bg-background rounded-lg border p-3 shadow-sm space-y-2">
                                                                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                                Daftar Toko Coverage {bms.name} ({bms.stores.length} Toko)
                                                                            </span>
                                                                            <div className="w-56 relative">
                                                                                <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                                                                                <Input
                                                                                    placeholder="Filter toko..."
                                                                                    value={storeSearchByBms[bms.nik] || ""}
                                                                                    onChange={(e) =>
                                                                                        setStoreSearchByBms((prev) => ({
                                                                                            ...prev,
                                                                                            [bms.nik]: e.target.value,
                                                                                        }))
                                                                                    }
                                                                                    className="h-7 pl-7 text-[11px]"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="max-h-[300px] overflow-y-auto rounded border">
                                                                            <Table className="text-xs">
                                                                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                                                                    <TableRow>
                                                                                        <TableHead className="w-[110px]">Kode Toko</TableHead>
                                                                                        <TableHead>Nama Toko</TableHead>
                                                                                        <TableHead className="w-[140px]">Status Preventif</TableHead>
                                                                                        <TableHead className="w-[180px]">No. Laporan</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {displayedStores.length === 0 ? (
                                                                                        <TableRow>
                                                                                            <TableCell
                                                                                                colSpan={4}
                                                                                                className="h-16 text-center text-muted-foreground text-xs"
                                                                                            >
                                                                                                Tidak ada toko yang cocok
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ) : (
                                                                                        displayedStores.map((s) => (
                                                                                            <TableRow key={s.storeCode} className="hover:bg-slate-50/70">
                                                                                                <TableCell className="font-mono font-medium">
                                                                                                    {s.storeCode}
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    {s.storeName}
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    {s.isCompleted ? (
                                                                                                        <Badge
                                                                                                            variant="outline"
                                                                                                            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]"
                                                                                                        >
                                                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                                                            Selesai
                                                                                                        </Badge>
                                                                                                    ) : (
                                                                                                        <Badge
                                                                                                            variant="outline"
                                                                                                            className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px]"
                                                                                                        >
                                                                                                            <Clock className="w-3 h-3" />
                                                                                                            Pending
                                                                                                        </Badge>
                                                                                                    )}
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    {s.reportNumber ? (
                                                                                                        <Link
                                                                                                            href={`/dashboard/reports/${s.reportNumber}`}
                                                                                                            className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                                                                                                            target="_blank"
                                                                                                        >
                                                                                                            {s.reportNumber}
                                                                                                            <ExternalLink className="w-3 h-3" />
                                                                                                        </Link>
                                                                                                    ) : (
                                                                                                        <span className="text-muted-foreground">-</span>
                                                                                                    )}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))
                                                                                    )}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
