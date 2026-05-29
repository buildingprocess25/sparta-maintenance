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
import type { AdminTrendDatum } from "../../queries";

const trendConfig = {
    completed: { label: "Laporan Selesai", color: "var(--chart-3)" },
    avgRealisasi: {
        label: "Rata-rata Realisasi",
        color: "#f4bb44",
    },
};

type TrendChartProps = {
    data: AdminTrendDatum[];
};

function formatTooltipRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function AdminTrendChart({ data }: TrendChartProps) {
    return (
        <ChartContainer config={trendConfig} className="h-88 w-full">
            <ComposedChart
                data={data}
                margin={{ top: 12, right: 12, left: -24, bottom: 0 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={80}
                    tick={{
                        angle: -40,
                        textAnchor: "end",
                        fontSize: 11,
                    }}
                />
                <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                        new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            compactDisplay: "short",
                        }).format(Number(value))
                    }
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                        new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            compactDisplay: "short",
                        }).format(Number(value))
                    }
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            className="min-w-72 gap-2 p-3"
                            labelFormatter={(label, payload) => {
                                const row = payload?.[0]?.payload as
                                    | AdminTrendDatum
                                    | undefined;
                                return (
                                    <div className="space-y-1">
                                        <div className="text-sm font-semibold">
                                            {row?.branchName ?? label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Ringkasan laporan selesai per cabang
                                        </div>
                                    </div>
                                );
                            }}
                            formatter={(value, name, item) => {
                                const row = item.payload as AdminTrendDatum;
                                if (name === "avgRealisasi") {
                                    return (
                                        <div className="grid w-64 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                                            <span className="text-muted-foreground">
                                                Rata-rata realisasi
                                            </span>
                                            <span className="text-right font-mono font-medium tabular-nums text-foreground">
                                                {formatTooltipRp(Number(value))}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid w-64 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                                        <span className="text-muted-foreground">
                                            Laporan selesai
                                        </span>
                                        <span className="text-right font-mono font-medium tabular-nums text-foreground">
                                            {Number(value).toLocaleString(
                                                "id-ID",
                                            )}{" "}
                                            laporan
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    }
                />
                <Bar
                    dataKey="completed"
                    yAxisId="left"
                    fill="var(--color-completed)"
                    radius={[4, 4, 0, 0]}
                />
                <Line
                    dataKey="avgRealisasi"
                    yAxisId="right"
                    type="monotone"
                    stroke="var(--color-avgRealisasi)"
                    strokeWidth={2}
                    dot={false}
                />
            </ComposedChart>
        </ChartContainer>
    );
}
