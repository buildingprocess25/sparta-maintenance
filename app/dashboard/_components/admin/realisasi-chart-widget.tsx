"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Legend,
  Line,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { fetchAdminRealisasiDetailAction } from "../../../actions";
import type { AdminRealisasiDetail } from "../../../queries";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

type RealisasiChartWidgetProps = {
  initialData: AdminRealisasiDetail;
  brand: StoreBrandFilter;
};

export function RealisasiChartWidget({
  initialData,
  brand,
}: RealisasiChartWidgetProps) {
  const [period, setPeriod] = useState<string>("ytd");
  const [data, setData] = useState<AdminRealisasiDetail>(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // If brand changes from global filter, we want to refetch with current local period
    startTransition(() => {
      fetchAdminRealisasiDetailAction(brand, period).then(setData);
    });
  }, [brand, period]);

  const sortedData = [...data.byBranch].sort((a, b) =>
    a.branchName.localeCompare(b.branchName)
  );

  return (
    <Card className="w-full relative">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <CardHeader className="pb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Rata-Rata Realisasi Per Laporan
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Perbandingan antara total jumlah laporan dan rata-rata realisasi
              biaya per laporan di setiap cabang
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ytd">YTD (Tahun Ini)</SelectItem>
              <SelectItem value="Q1">Triwulan 1</SelectItem>
              <SelectItem value="Q2">Triwulan 2</SelectItem>
              <SelectItem value="Q3">Triwulan 3</SelectItem>
              <SelectItem value="Q4">Triwulan 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ChartContainer
          config={{
            count: { label: "Jumlah Laporan", color: "var(--chart-3)" },
            avg: { label: "Rata-Rata Biaya", color: "#f4bb44" },
          }}
          className="h-full w-full"
        >
          <ComposedChart
            data={sortedData}
            margin={{ top: 10, right: 10, bottom: 60, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="branchName"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={(val) => `Rp ${val / 1000}k`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              dx={10}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-60"
                  labelFormatter={(label) => (
                    <div className="text-sm font-semibold mb-1">{label}</div>
                  )}
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between items-center gap-4">
                      <span className="text-muted-foreground text-xs">
                        {name === "avg"
                          ? "Rata-Rata Biaya"
                          : "Jumlah Laporan"}
                      </span>
                      <span className="font-mono font-medium text-xs">
                        {name === "avg"
                          ? `Rp ${Number(value).toLocaleString("id-ID")}`
                          : value}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Legend
              verticalAlign="top"
              height={40}
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", fontWeight: 500 }}
              formatter={(value) => (
                <span className="text-muted-foreground ml-1">
                  {value === "avg" ? "Rata-Rata Biaya" : "Jumlah Laporan"}
                </span>
              )}
            />
            <Bar
              yAxisId="right"
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avg"
              stroke="var(--color-avg)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-avg)" }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
