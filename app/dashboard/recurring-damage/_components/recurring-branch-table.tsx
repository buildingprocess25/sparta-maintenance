"use client";

import { ChevronRight, Store } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RecurringDamageBranchSummary } from "@/lib/recurring-damage";
import { cn } from "@/lib/utils";
import { HeaderWithInfo } from "./header-with-info";

export function RecurringBranchTable({
    branches,
    onSelectBranch,
}: {
    branches: RecurringDamageBranchSummary[];
    onSelectBranch: (branchName: string) => void;
}) {
    return (
        <TooltipProvider>
            <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                    Klik cabang untuk melihat daftar toko dengan kerusakan berulang.
                </p>
                <div className="overflow-hidden rounded-lg border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="min-w-[180px] text-[11px]">Cabang</TableHead>
                                <TableHead className="min-w-[260px] text-[11px]">
                                    <HeaderWithInfo
                                        label="Jumlah toko dengan kerusakan berulang"
                                        info="Banyaknya toko di cabang ini yang punya minimal 1 item checklist rusak 2 kali atau lebih pada periode terpilih."
                                    />
                                </TableHead>
                                <TableHead className="w-[130px] text-[11px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <EmptyTable
                                            icon={Store}
                                            title="Tidak ada cabang"
                                            description="Filter belum menghasilkan data cabang."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                branches.map((branch) => (
                                    <TableRow
                                        key={branch.branchName}
                                        className="cursor-pointer"
                                        onClick={() => onSelectBranch(branch.branchName)}
                                    >
                                        <TableCell className="text-xs font-medium">
                                            {branch.branchName}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-xs",
                                                branch.problematicStoreCount > 0
                                                    ? "text-red-700"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            <span className="font-medium">
                                                {branch.problematicStoreCount}
                                            </span>{" "}
                                            toko
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onSelectBranch(branch.branchName);
                                                }}
                                            >
                                                Lihat toko
                                                <ChevronRight data-icon="inline-end" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
