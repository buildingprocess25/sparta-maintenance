import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getStatusSegmentClass } from "./sla-status-guide";
import type { AdminStatusDatum } from "../../../queries";

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

export function StatusDistributionKpis({
    status,
    breakdown,
}: {
    status: AdminStatusDatum[];
    breakdown?: { alfamart: number; lawson: number };
}) {
    const visibleStatus = status.filter((item) => item.slaDays !== null);
    const totalActive = visibleStatus.reduce(
        (sum, item) => sum + item.count,
        0,
    );
    const totalOverdue = visibleStatus.reduce(
        (sum, item) => sum + item.overdueCount,
        0,
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="text-sm text-muted-foreground">
                        Laporan aktif
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight">
                        {formatNumber(totalActive)}
                    </div>
                    {breakdown && (
                        <div className="mt-1 flex items-center gap-3 text-xs font-medium">
                            <span className="text-red-600">Alfamart: {breakdown.alfamart}</span>
                            <span className="text-blue-600">Lawson: {breakdown.lawson}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge
                        variant="outline"
                        className={
                            totalOverdue > 0
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }
                    >
                        {totalOverdue > 0
                            ? `${formatNumber(totalOverdue)} lewat SLA`
                            : "SLA aman"}
                    </Badge>
                </div>
            </div>

            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {visibleStatus.map((item) => (
                    <span
                        key={item.status}
                        className={getStatusSegmentClass(item.status)}
                        style={{
                            width: `${Math.max(
                                3,
                                totalActive > 0
                                    ? (item.count / totalActive) * 100
                                    : 0,
                            )}%`,
                        }}
                    />
                ))}
            </div>

            <div className="rounded-lg border">
                <Table className="text-xs" containerClassName="max-h-[300px]">
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-24 text-right">
                                Jumlah
                            </TableHead>
                            <TableHead className="w-20 text-right">%</TableHead>
                            <TableHead className="w-36 text-right">
                                Kondisi SLA
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleStatus.map((item) => {
                            const percentage =
                                totalActive > 0
                                    ? Math.round(
                                          (item.count / totalActive) * 100,
                                      )
                                    : 0;

                            return (
                                <TableRow key={item.status}>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/reports?status=${item.status}`}
                                            className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${getStatusSegmentClass(
                                                    item.status,
                                                )}`}
                                            />
                                            {item.label}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatNumber(item.count)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {percentage}%
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.overdueCount > 0
                                                    ? "border-red-200 bg-red-50 text-red-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }
                                        >
                                            {item.overdueCount > 0
                                                ? `${formatNumber(item.overdueCount)} lewat batas`
                                                : `Batas ${item.slaDays} hari`}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatNumber(totalActive)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                100%
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge
                                    variant="outline"
                                    className={
                                        totalOverdue > 0
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    }
                                >
                                    {totalOverdue > 0
                                        ? `${formatNumber(totalOverdue)} lewat batas`
                                        : "SLA aman"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {visibleStatus.length === 0 && (
                <div className="flex min-h-24 items-center rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                    Belum ada laporan aktif dengan SLA.
                </div>
            )}
        </div>
    );
}
