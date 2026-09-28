"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
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

    return (
        <div className="space-y-4 min-w-0">
            <div className="border-b pb-2">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
            </div>
            
            <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
                <div className="w-full overflow-x-auto">
                    <Table className="text-sm [&_td]:py-3 [&_th]:py-3 border-collapse">
                        <TableHeader className="bg-muted/50">
                            <TableRow className="divide-x divide-border/50">
                                <TableHead className="font-bold text-black border-r border-border/50 w-12 text-center">#</TableHead>
                                <TableHead className="font-bold text-black border-r border-border/50">Nama Cabang</TableHead>
                                <TableHead className="font-bold text-black border-r border-border/50 w-32 text-center">Jumlah BMS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                                        Tidak ada data SLA.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((branch, index) => {
                                    const isExpanded = expandedBranches.has(branch.branchName);
                                    return (
                                        <React.Fragment key={branch.branchName}>
                                            <TableRow 
                                                className="cursor-pointer bg-background hover:bg-muted/20 divide-x divide-border/50 transition-colors" 
                                                onClick={() => toggleBranch(branch.branchName)}
                                            >
                                                <TableCell className="text-center font-medium">
                                                    <div className="flex items-center justify-center">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-primary">{branch.branchName}</TableCell>
                                                <TableCell className="text-center font-medium">{branch.bmsList.length} BMS</TableCell>
                                            </TableRow>
                                            
                                            {isExpanded && (
                                                <TableRow className="bg-muted/5">
                                                    <TableCell colSpan={3} className="p-0 border-b">
                                                        <div className="p-4 bg-muted/10 inner-shadow-sm">
                                                            <div className="rounded-md border bg-background overflow-x-auto">
                                                                <Table className="text-xs [&_td]:py-2 [&_th]:py-2">
                                                                    <TableHeader className="bg-orange-100/50">
                                                                        <TableRow className="divide-x divide-border/50">
                                                                            <TableHead className="min-w-[200px] font-bold text-black border-r border-border/50">Nama BMS</TableHead>
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
                                                                        {branch.bmsList.length === 0 ? (
                                                                            <TableRow>
                                                                                <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                                                                                    Belum ada laporan.
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ) : (
                                                                            branch.bmsList.map((bms) => (
                                                                                <TableRow key={`${branch.branchName}-${bms.bmsName}`} className="divide-x divide-border/50 hover:bg-muted/10">
                                                                                    <TableCell className="font-medium">{bms.bmsName}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.estimasiToAppvBMC)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.estimasiToRevisiBMC)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.appvBMCToWorkStart)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.workStartToRealisasi)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.realisasiToRevisiBMC)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.realisasiToAppvBMC)}</TableCell>
                                                                                    <TableCell className="text-center font-mono">{formatDuration(bms.appvBMCToAppvMGR)}</TableCell>
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
