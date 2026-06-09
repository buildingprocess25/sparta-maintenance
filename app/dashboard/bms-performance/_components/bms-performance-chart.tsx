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
import type { BmsPerformanceTrendDatum } from "../actions";

const chartConfig = {
    totalRealisasi: {
        label: "Total realisasi",
        color: "var(--chart-3)",
    },
    avgBmsWeeklyRealisasi: {
        label: "Rata-rata BMS / minggu",
        color: "var(--chart-2)",
    },
};

function formatCompactRp(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
        notation: "compact",
        compactDisplay: "short",
    }).format(value);
}

function formatRp(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

export function BmsPerformanceChart({
    data,
}: {
    data: BmsPerformanceTrendDatum[];
}) {
    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-72 w-full"
        >
            <ComposedChart
                data={data}
                margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompactRp(Number(value))}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            className="min-w-72"
                            formatter={(value, name) => {
                                const label =
                                    chartConfig[
                                        name as keyof typeof chartConfig
                                    ]?.label ?? name;
                                return (
                                    <div className="grid w-64 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="text-right font-mono font-medium tabular-nums text-foreground">
                                            {formatRp(Number(value))}
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    }
                />
                <Bar
                    dataKey="totalRealisasi"
                    fill="var(--color-totalRealisasi)"
                    radius={[4, 4, 0, 0]}
                />
                <Line
                    dataKey="avgBmsWeeklyRealisasi"
                    type="monotone"
                    stroke="var(--color-avgBmsWeeklyRealisasi)"
                    strokeWidth={2}
                    dot={false}
                />
            </ComposedChart>
        </ChartContainer>
    );
}
