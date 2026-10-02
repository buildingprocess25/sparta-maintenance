"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { ChevronDown, ChevronRight, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { SLADurationBranch } from "../actions";

function formatDuration(seconds: number | null): string {
    if (seconds === null) return "-";
    if (seconds < 0) return "-"; 
    
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.round(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
}

export function AdminSLATable({ data }: { data: SLADurationBranch[] }) {
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

    const toggleBranch = (branchName: string) => {
        const next = new Set(expandedBranches);
        if (next.has(branchName)) next.delete(branchName);
        else next.add(branchName);
        setExpandedBranches(next);
    };

    const handleExport = () => {
        const rows: Record<string, string | number>[] = [];

        data.forEach((branch) => {
            rows.push({
                "Nama Cabang": branch.branchName,
                "Nama BMS": "[RATA-RATA CABANG]",
                "JUMLAH LAPORAN SELESAI": branch.reportCount,
                "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(branch.estimasiToAppvBMC),
                "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(branch.estimasiToRevisiBMC),
                "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(branch.appvBMCToWorkStart),
                "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(branch.workStartToRealisasi),
                "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(branch.realisasiToRevisiBMC),
                "REALISASI DIAJUKAN - APPV BMC": formatDuration(branch.realisasiToAppvBMC),
                "APPV BMC - APPV MGR": formatDuration(branch.appvBMCToAppvMGR),
            });

            branch.bmsList.forEach((bms) => {
                rows.push({
                    "Nama Cabang": branch.branchName,
                    "Nama BMS": bms.bmsName,
                    "JUMLAH LAPORAN SELESAI": bms.reportCount,
                    "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(bms.estimasiToAppvBMC),
                    "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(bms.estimasiToRevisiBMC),
                    "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(bms.appvBMCToWorkStart),
                    "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(bms.workStartToRealisasi),
                    "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(bms.realisasiToRevisiBMC),
                    "REALISASI DIAJUKAN - APPV BMC": formatDuration(bms.realisasiToAppvBMC),
                    "APPV BMC - APPV MGR": formatDuration(bms.appvBMCToAppvMGR),
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SLA Proses");
        XLSX.writeFile(workbook, "SLA_Proses_SPARTA.xlsx");
    };

    return (
        <div className="space-y-4 min-w-0">
            <div className="border-b pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
                    <p className="mt-1 text-[11px] font-medium text-amber-600/90 dark:text-amber-500/90 bg-amber-50 dark:bg-amber-500/10 inline-block px-2 py-0.5 rounded">
                        *Hanya menghitung durasi dari laporan yang statusnya sudah selesai (COMPLETED).
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    disabled={data.length === 0}
                    className="shrink-0"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor XLSX
                </Button>
            </div>
            
            <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
                <div className="w-full overflow-x-auto">
                    <Table className="text-xs [&_td]:py-2 [&_th]:py-2 border-collapse">
                        <TableHeader className="bg-blue-100/50">
                            <TableRow className="divide-x divide-border/50">
                                <TableHead className="min-w-[200px] font-bold text-black border-r border-border/50">Nama Cabang / BMS</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PENGAJUAN ESTIMASI - APPV ESTIMASI BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PEKERJAAN DIMULAI - REALISASI DIAJUKAN</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">REALISASI DIAJUKAN - APPV BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black">APPV BMC - APPV MGR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                                        Tidak ada data SLA.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((branch) => {
                                    const isExpanded = expandedBranches.has(branch.branchName);
                                    return (
                                        <React.Fragment key={branch.branchName}>
                                            <TableRow 
                                                className="cursor-pointer bg-muted/20 hover:bg-muted/40 divide-x divide-border/50" 
                                                onClick={() => toggleBranch(branch.branchName)}
                                            >
                                                <TableCell className="font-semibold text-primary py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                                        <span>{branch.branchName} <span className="text-muted-foreground font-normal">({branch.bmsList.length} BMS)</span></span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.estimasiToAppvBMC)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.estimasiToRevisiBMC)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.appvBMCToWorkStart)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.workStartToRealisasi)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.realisasiToRevisiBMC)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.realisasiToAppvBMC)}</TableCell>
                                                <TableCell className="text-center font-bold font-mono bg-muted/10">{formatDuration(branch.appvBMCToAppvMGR)}</TableCell>
                                            </TableRow>
                                            
                                            {isExpanded && branch.bmsList.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-4 bg-background">
                                                        Belum ada laporan dari BMS manapun di cabang ini.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            
                                            {isExpanded && branch.bmsList.map((bms) => (
                                                <TableRow key={`${branch.branchName}-${bms.bmsName}`} className="divide-x divide-border/50 bg-background hover:bg-muted/10">
                                                    <TableCell className="pl-8 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-border" />
                                                            {bms.bmsName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.estimasiToAppvBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.estimasiToRevisiBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.appvBMCToWorkStart)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.workStartToRealisasi)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.realisasiToRevisiBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.realisasiToAppvBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">{formatDuration(bms.appvBMCToAppvMGR)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
