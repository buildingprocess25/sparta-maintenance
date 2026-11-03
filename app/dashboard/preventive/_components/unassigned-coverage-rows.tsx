"use client";

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
import { ChevronRight, CheckCircle2, Clock, ExternalLink, UserX } from "lucide-react";
import type { UnassignedCoverage } from "../coverage-hierarchy";

type Props = {
    branchName: string;
    unassigned: UnassignedCoverage;
    isExpanded: boolean;
    onToggle: () => void;
    canManageStores: boolean;
};

export function UnassignedCoverageRows({
    branchName,
    unassigned,
    isExpanded,
    onToggle,
    canManageStores,
}: Props) {
    return (
        <>
            <TableRow
                className="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 cursor-pointer border-b"
                onClick={onToggle}
            >
                <TableCell className="py-2.5 pl-8">
                    <div className="flex items-center gap-2">
                        <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                isExpanded ? "rotate-90 text-amber-600" : ""
                            }`}
                        />
                        <UserX className="w-4 h-4 text-amber-600" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-amber-800 dark:text-amber-300">
                                Belum di-assign BMS
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Toko aktif tanpa BMS penanggung jawab
                            </span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="text-center">{unassigned.totalStores}</TableCell>
                <TableCell className="text-center text-emerald-600 font-medium">
                    {unassigned.completedStores}
                </TableCell>
                <TableCell className="text-center text-amber-600 font-medium">
                    {unassigned.pendingStores}
                </TableCell>
                <TableCell>
                    <Badge
                        variant="outline"
                        className={`text-xs ${
                            unassigned.coverageRate >= 100
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : unassigned.coverageRate >= 50
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                        Pencapaian: {unassigned.coverageRate}%
                    </Badge>
                </TableCell>
            </TableRow>

            {isExpanded && (
                <TableRow className="bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50/40">
                    <TableCell colSpan={5} className="p-3 pl-12 pr-6">
                        <div className="bg-background rounded-lg border p-3 shadow-sm space-y-2">
                            <div className="border-b pb-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Toko Belum Di-assign ({unassigned.stores.length} Toko)
                                </span>
                            </div>

                            <div className="rounded border overflow-hidden">
                                <Table
                                    className="text-xs"
                                    containerClassName="max-h-[300px] overflow-y-auto"
                                >
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[110px]">Kode Toko</TableHead>
                                            <TableHead>Nama Toko</TableHead>
                                            <TableHead className="w-[140px]">Status Preventif</TableHead>
                                            <TableHead className="w-[180px]">Dikerjakan oleh</TableHead>
                                            <TableHead className="w-[180px]">No. Laporan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unassigned.stores.map((s) => (
                                            <TableRow key={s.storeCode} className="hover:bg-slate-50/70">
                                                <TableCell className="font-mono font-medium">
                                                    {canManageStores ? (
                                                        <Link
                                                            href={`/dashboard/stores?search=${encodeURIComponent(
                                                                s.storeCode,
                                                            )}&branch=${encodeURIComponent(branchName)}`}
                                                            className="text-primary hover:underline inline-flex items-center gap-1"
                                                            target="_blank"
                                                        >
                                                            {s.storeCode}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    ) : (
                                                        s.storeCode
                                                    )}
                                                </TableCell>
                                                <TableCell>{s.storeName}</TableCell>
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
                                                    {s.doneByName ?? (
                                                        <span className="text-muted-foreground">-</span>
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
