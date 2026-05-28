"use client";

import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import type {
    RealisasiMonthDatum,
    RealisasiBranchDatum,
} from "../queries";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCompactRp(value: number): string {
    return new Intl.NumberFormat("id-ID", {
        notation: "compact",
        compactDisplay: "short",
    }).format(value);
}

function formatTooltipRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

// ─── Monthly Trend Chart ──────────────────────────────────────────────────────

const monthlyConfig = {
    totalRealisasi: { label: "Total Realisasi", color: "var(--chart-1)" },
    avgPerReport: { label: "Rata-rata / Laporan", color: "var(--chart-2)" },
};

export function RealisasiMonthlyChart({
    data,
}: {
    data: RealisasiMonthDatum[];
}) {
    return (
        <ChartContainer config={monthlyConfig} className="h-80 w-full">
            <ComposedChart
                data={data}
                margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={64}
                    tick={{
                        angle: -35,
                        textAnchor: "end",
                        fontSize: 11,
                    }}
                />
                <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactRp}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactRp}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            className="min-w-64 gap-2 p-3"
                            labelFormatter={(_label, payload) => {
                                const row = payload?.[0]?.payload as
                                    | RealisasiMonthDatum
                                    | undefined;
                                return (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold">
                                            {row?.label ?? _label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {row?.count ?? 0} laporan selesai
                                        </span>
                                    </div>
                                );
                            }}
                            formatter={(value, name) => {
                                const label =
                                    name === "avgPerReport"
                                        ? "Rata-rata / laporan"
                                        : "Total realisasi";
                                return (
                                    <div className="grid w-56 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="text-right font-mono font-medium tabular-nums text-foreground">
                                            {formatTooltipRp(Number(value))}
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    }
                />
                <Bar
                    dataKey="totalRealisasi"
                    yAxisId="left"
                    fill="var(--color-totalRealisasi)"
                    radius={[4, 4, 0, 0]}
                />
                <Line
                    dataKey="avgPerReport"
                    yAxisId="right"
                    type="monotone"
                    stroke="var(--color-avgPerReport)"
                    strokeWidth={2}
                    dot={false}
                />
            </ComposedChart>
        </ChartContainer>
    );
}

// ─── Branch Comparison Chart ──────────────────────────────────────────────────

const branchConfig = {
    totalEstimasi: { label: "Estimasi", color: "var(--chart-3)" },
    totalRealisasi: { label: "Realisasi", color: "var(--chart-1)" },
};

export function RealisasiBranchChart({
    data,
}: {
    data: RealisasiBranchDatum[];
}) {
    // Show top 10 branches
    const sliced = data.slice(0, 10);

    return (
        <ChartContainer config={branchConfig} className="h-96 w-full">
            <ComposedChart
                data={sliced}
                layout="vertical"
                margin={{ top: 12, right: 24, left: 12, bottom: 0 }}
            >
                <CartesianGrid horizontal={false} />
                <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactRp}
                />
                <YAxis
                    type="category"
                    dataKey="branchName"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            className="min-w-64 gap-2 p-3"
                            labelFormatter={(_label, payload) => {
                                const row = payload?.[0]?.payload as
                                    | RealisasiBranchDatum
                                    | undefined;
                                return (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold">
                                            {row?.branchName ?? _label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {row?.completedCount ?? 0} laporan
                                            selesai
                                        </span>
                                    </div>
                                );
                            }}
                            formatter={(value, name) => {
                                const label =
                                    name === "totalEstimasi"
                                        ? "Total estimasi"
                                        : "Total realisasi";
                                return (
                                    <div className="grid w-56 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="text-right font-mono font-medium tabular-nums text-foreground">
                                            {formatTooltipRp(Number(value))}
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    }
                />
                <Bar
                    dataKey="totalEstimasi"
                    fill="var(--color-totalEstimasi)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                />
                <Bar
                    dataKey="totalRealisasi"
                    fill="var(--color-totalRealisasi)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                />
            </ComposedChart>
        </ChartContainer>
    );
}
