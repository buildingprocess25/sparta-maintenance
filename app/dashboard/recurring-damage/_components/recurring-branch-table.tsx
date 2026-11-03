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
import type { RecurringDamageBranchSummary } from "@/lib/recurring-damage";
import { cn } from "@/lib/utils";

export function RecurringBranchTable({
    branches,
    onSelectBranch,
}: {
    branches: RecurringDamageBranchSummary[];
    onSelectBranch: (branchName: string) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-background">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[180px] text-[11px]">Cabang</TableHead>
                        <TableHead className="min-w-[140px] text-[11px]">
                            Toko problematik
                        </TableHead>
                        <TableHead className="w-[48px] text-[11px]" />
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
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-xs font-medium text-foreground"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectBranch(branch.branchName);
                                        }}
                                    >
                                        {branch.branchName}
                                    </Button>
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "text-xs",
                                        branch.problematicStoreCount > 0
                                            ? "font-medium text-red-700"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {branch.problematicStoreCount}
                                </TableCell>
                                <TableCell>
                                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
