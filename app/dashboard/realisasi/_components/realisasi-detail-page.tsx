"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import type { AdminRealisasiDetail } from "../../queries";
import {
    IconBuildingStore,
    IconCalendar,
    IconChartBar,
} from "@tabler/icons-react";

function formatRp(n: number): string {
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

const chartConfigMonth = {
    avg: { label: "Rata-rata Realisasi", color: "#8b5cf6" },
};

const ALL_BRANCH = "all";

type Props = {
    data: AdminRealisasiDetail;
};

export function RealisasiDetailPage({ data }: Props) {
    const year = new Date().getFullYear();
    const [branchFilter, setBranchFilter] = useState(ALL_BRANCH);

    const monthData = useMemo(() => {
        if (branchFilter === ALL_BRANCH) return data.byMonth;
        return data.byMonthByBranch[branchFilter] ?? data.byMonth;
    }, [branchFilter, data.byMonth, data.byMonthByBranch]);

    const branchOptions = useMemo(
        () => data.byBranch.map((row) => row.branchName),
        [data.byBranch],
    );

    return (
        <div className="space-y-6">
            {/* Back button + subheader */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Data Year-to-Date: 1 Januari {year} — hari ini
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="branch" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                    <TabsTrigger
                        value="branch"
                        className="flex items-center gap-2"
                    >
                        <IconBuildingStore className="h-4 w-4" />
                        Per Cabang
                    </TabsTrigger>
                    <TabsTrigger
                        value="month"
                        className="flex items-center gap-2"
                    >
                        <IconCalendar className="h-4 w-4" />
                        Per Bulan
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab: Per Cabang ── */}
                <TabsContent value="branch" className="space-y-6 mt-6">
                    {data.byBranch.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <IconChartBar className="h-12 w-12 opacity-30" />
                            <p>Belum ada data laporan selesai tahun ini.</p>
                        </div>
                    ) : (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Detail per Cabang
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="pl-6">
                                                    Cabang
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Laporan Selesai
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Rata-rata
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Tertinggi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.byBranch.map((row, i) => (
                                                <TableRow key={row.branchName}>
                                                    <TableCell className="pl-6 font-medium flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-5 text-right">
                                                            {i + 1}.
                                                        </span>
                                                        {row.branchName}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {row.count}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-violet-600 dark:text-violet-400">
                                                        {formatRp(row.avg)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                                        {formatRp(row.max)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ── Tab: Per Bulan ── */}
                <TabsContent value="month" className="space-y-6 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            Filter cabang
                        </p>
                        <Select
                            value={branchFilter}
                            onValueChange={setBranchFilter}
                        >
                            <SelectTrigger className="w-full sm:w-60">
                                <SelectValue placeholder="Semua Cabang" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_BRANCH}>
                                    Semua Cabang
                                </SelectItem>
                                {branchOptions.map((branch) => (
                                    <SelectItem key={branch} value={branch}>
                                        {branch}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {monthData.every((m) => m.count === 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <IconChartBar className="h-12 w-12 opacity-30" />
                            <p>Belum ada data laporan selesai tahun ini.</p>
                        </div>
                    ) : (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <IconChartBar className="h-4 w-4 text-violet-500" />
                                        Tren Rata-rata Realisasi per Bulan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer
                                        config={chartConfigMonth}
                                        className="h-72 w-full"
                                    >
                                        <LineChart
                                            data={monthData}
                                            margin={{
                                                top: 10,
                                                right: 24,
                                                left: 8,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={(v) =>
                                                    new Intl.NumberFormat(
                                                        "id-ID",
                                                        {
                                                            notation: "compact",
                                                            compactDisplay:
                                                                "short",
                                                        },
                                                    ).format(v)
                                                }
                                            />
                                            <ChartTooltip
                                                content={
                                                    <ChartTooltipContent
                                                        formatter={(value) =>
                                                            `Rp ${Number(value).toLocaleString("id-ID")}`
                                                        }
                                                    />
                                                }
                                            />
                                            <Line
                                                dataKey="avg"
                                                type="monotone"
                                                stroke="var(--color-avg)"
                                                strokeWidth={2.5}
                                                dot={{
                                                    r: 4,
                                                    fill: "var(--color-avg)",
                                                }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Detail per Bulan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="pl-6">
                                                    Bulan
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Laporan Selesai
                                                </TableHead>
                                                <TableHead className="text-right pr-6">
                                                    Rata-rata Realisasi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {monthData.map((row) => (
                                                <TableRow key={row.yearMonth}>
                                                    <TableCell className="pl-6 font-medium">
                                                        {row.label}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {row.count === 0 ? (
                                                            <span className="opacity-40">
                                                                —
                                                            </span>
                                                        ) : (
                                                            row.count
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 font-semibold text-violet-600 dark:text-violet-400">
                                                        {row.avg === 0 ? (
                                                            <span className="text-muted-foreground font-normal opacity-40">
                                                                —
                                                            </span>
                                                        ) : (
                                                            formatRp(row.avg)
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
