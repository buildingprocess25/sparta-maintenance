"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";

type DataPoint = {
    month: string;
    total: number;
    completed: number;
};

type Props = {
    data: DataPoint[];
};

const chartConfig = {
    total: {
        label: "Total Laporan",
        color: "var(--chart-1)",
    },
    completed: {
        label: "Selesai",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

export function MonthlyTrendChart({ data }: Props) {
    return (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                barSize={14}
                barCategoryGap="35%"
            >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="completed"
                    fill="var(--color-completed)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}
