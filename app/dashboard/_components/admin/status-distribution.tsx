import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { getStatusSegmentClass } from "./sla-status-guide";
import { isActiveReportStatus } from "@/lib/report-status";
import type { AdminStatusDatum } from "@/app/dashboard/queries";

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
    const visibleStatus = status.filter((item) => isActiveReportStatus(item.status));
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

            <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                {visibleStatus.map((item) => (
                    item.count > 0 ? (
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
                    ) : null
                ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleStatus.map((item) => {
                    const percentage =
                        totalActive > 0
                            ? Math.round((item.count / totalActive) * 100)
                            : 0;

                    return (
                        <Link
                            key={item.status}
                            href={`/dashboard/reports?status=${item.status}`}
                            className="group flex flex-col justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusSegmentClass(
                                            item.status
                                        )}`}
                                    />
                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors line-clamp-1">
                                        {item.label}
                                    </span>
                                </div>
                                <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            </div>
                            
                            <div className="mt-4 flex items-end justify-between gap-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-semibold tracking-tight leading-none">
                                        {formatNumber(item.count)}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                        {percentage}%
                                    </span>
                                </div>
                                {item.overdueCount > 0 && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                        {formatNumber(item.overdueCount)} lewat SLA
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {visibleStatus.length === 0 && (
                <div className="flex min-h-24 items-center rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                    Belum ada laporan aktif dengan SLA.
                </div>
            )}
        </div>
    );
}
