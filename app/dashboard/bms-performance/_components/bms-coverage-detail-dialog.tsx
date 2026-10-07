"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { CheckCircle2, Clock, Search } from "lucide-react";
import Link from "next/link";

export type CoverageStoreItem = {
    storeCode: string;
    storeName: string;
    branchName?: string;
    isCompleted: boolean;
    doneAt?: string;
    reportNumber?: string;
};

type Props = {
    bmsName: string;
    bmsNIK: string;
    stores: CoverageStoreItem[];
    kpiRate: number;
    trigger?: React.ReactNode;
};

export function BmsCoverageDetailDialog({
    bmsName,
    bmsNIK,
    stores,
    kpiRate,
    trigger,
}: Props) {
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");

    const filteredStores = stores.filter((s) => {
        const matchSearch =
            s.storeName.toLowerCase().includes(search.toLowerCase()) ||
            s.storeCode.toLowerCase().includes(search.toLowerCase());

        if (!matchSearch) return false;
        if (filterStatus === "completed") return s.isCompleted;
        if (filterStatus === "pending") return !s.isCompleted;
        return true;
    });

    const completedCount = stores.filter((s) => s.isCompleted).length;
    const pendingCount = stores.length - completedCount;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                        Lihat Toko ({stores.length})
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl lg:max-w-5xl w-[95vw] max-h-[88vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base font-semibold flex items-center justify-between">
                        <span>Coverage Toko: {bmsName} ({bmsNIK})</span>
                        <Badge
                            variant="outline"
                            className={`text-xs ${
                                kpiRate >= 100
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : kpiRate >= 50
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                            Pencapaian: {kpiRate}%
                        </Badge>
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Total {stores.length} toko coverage • {completedCount} selesai • {pendingCount} pending
                    </p>
                </DialogHeader>

                <div className="flex items-center gap-2 my-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari kode atau nama toko..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            variant={filterStatus === "all" ? "default" : "outline"}
                            className="h-8 text-xs px-2.5"
                            onClick={() => setFilterStatus("all")}
                        >
                            Semua ({stores.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={filterStatus === "completed" ? "default" : "outline"}
                            className="h-8 text-xs px-2.5"
                            onClick={() => setFilterStatus("completed")}
                        >
                            Selesai ({completedCount})
                        </Button>
                        <Button
                            size="sm"
                            variant={filterStatus === "pending" ? "default" : "outline"}
                            className="h-8 text-xs px-2.5"
                            onClick={() => setFilterStatus("pending")}
                        >
                            Pending ({pendingCount})
                        </Button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 border rounded-md overflow-hidden flex flex-col">
                    <Table
                        className="text-xs"
                        containerClassName="h-full max-h-[55vh] overflow-y-auto"
                    >
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[110px]">Kode Toko</TableHead>
                                <TableHead>Nama Toko</TableHead>
                                <TableHead className="w-[140px]">Status Preventif</TableHead>
                                <TableHead className="w-[180px]">No. Laporan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Tidak ada toko yang cocok dengan filter
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStores.map((s) => (
                                    <TableRow key={s.storeCode}>
                                        <TableCell className="font-mono font-medium">
                                            {s.storeCode}
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
                                            {s.reportNumber ? (
                                                <Link
                                                    href={`/dashboard/reports/${s.reportNumber}`}
                                                    className="font-mono text-primary hover:underline"
                                                    target="_blank"
                                                >
                                                    {s.reportNumber}
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
            </DialogContent>
        </Dialog>
    );
}
