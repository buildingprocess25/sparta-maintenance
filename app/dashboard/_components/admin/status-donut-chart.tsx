"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";

type Props = {
    completed: number;
    inProgress: number;
    other: number;
};

const chartConfig = {
    completed: {
        label: "Selesai",
        color: "var(--chart-2)",
    },
    inProgress: {
        label: "In Progress",
        color: "var(--chart-1)",
    },
    other: {
        label: "Lainnya",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig;

export function StatusDonutChart({ completed, inProgress, other }: Props) {
    const rawData = [
        { name: "completed", value: completed },
        { name: "inProgress", value: inProgress },
        { name: "other", value: other },
    ].filter((d) => d.value > 0);

    if (rawData.length === 0) {
        return (
            <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                Belum ada data laporan
            </div>
        );
    }

    return (
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Pie
                    data={rawData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={3}
                    strokeWidth={0}
                >
                    {rawData.map((entry) => (
                        <Cell
                            key={entry.name}
                            fill={`var(--color-${entry.name})`}
                        />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
    );
}
