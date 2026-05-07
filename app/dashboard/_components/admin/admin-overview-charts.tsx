"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import type { BranchChartData } from "../../queries";

const chartConfigLaporan = {
    total: { label: "Total Laporan", color: "#60afdb" },
};

const chartConfigRealisasi = {
    totalRealisasi: { label: "Total Akumulasi (Rp)", color: "#60afdb" },
};

type Props = {
    data: BranchChartData[];
};

export function AdminLaporanChart({ data }: Props) {
    return (
        <ChartContainer config={chartConfigLaporan} className="h-80 w-full">
            <BarChart
                data={data}
                margin={{ top: 20, right: 0, left: -20, bottom: 40 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="cabang"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ angle: -45, textAnchor: "end", fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) =>
                        new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            compactDisplay: "short",
                        }).format(value)
                    }
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent className="w-auto [&_.flex-1]:gap-6" />
                    }
                />
                <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}

export function AdminRealisasiChart({ data }: Props) {
    return (
        <ChartContainer config={chartConfigRealisasi} className="h-80 w-full">
            <BarChart
                data={data}
                margin={{ top: 20, right: 0, left: 0, bottom: 40 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="cabang"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ angle: -45, textAnchor: "end", fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) =>
                        new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            compactDisplay: "short",
                        }).format(value)
                    }
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            className="w-auto [&_.flex-1]:gap-6"
                            formatter={(value) =>
                                `Rp ${Number(value).toLocaleString("id-ID")}`
                            }
                        />
                    }
                />
                <Bar
                    dataKey="totalRealisasi"
                    fill="var(--color-totalRealisasi)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}
