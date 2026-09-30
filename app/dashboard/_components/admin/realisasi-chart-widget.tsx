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
import { Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { fetchAdminRealisasiDetailAction } from "../../actions";
import type { AdminRealisasiDetail } from "../../queries";
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = sortedData.map((item) => ({
                  Cabang: item.branchName,
                  "Jumlah Laporan (Total)": item.count,
                  "Jumlah Laporan (Valid)": item.validCount,
                  "Total Rp Realisasi": item.total,
                  "Avg Rp Realisasi": item.avg,
                }));
                const worksheet = XLSX.utils.json_to_sheet(rows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Realisasi Per Laporan");
                XLSX.writeFile(workbook, "Realisasi_Per_Laporan_SPARTA.xlsx");
              }}
              disabled={sortedData.length === 0 || isPending}
              className="h-9 text-xs"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export XLSX
            </Button>
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
            margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
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
              height={60}
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  // data = { branchName, count, validCount, total, avg }
                  const data = payload[0].payload as RealisasiBranchStat;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-sm min-w-64">
                      <div className="text-[13px] font-bold mb-2 uppercase border-b pb-1">
                        {label}
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex w-full justify-between items-center gap-4">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-count)]"></div>
                            Jumlah Laporan (Total)
                          </span>
                          <span className="font-mono font-medium text-xs">{data.count}</span>
                        </div>
                        <div className="flex w-full justify-between items-center gap-4">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-transparent"></div>
                            Laporan Valid (Ada Biaya)
                          </span>
                          <span className="font-mono font-medium text-xs">{data.validCount}</span>
                        </div>
                        <div className="flex w-full justify-between items-center gap-4">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-transparent"></div>
                            Total Realisasi
                          </span>
                          <span className="font-mono font-medium text-xs">
                            Rp {data.total.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex w-full justify-between items-center gap-4">
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#f4bb44]"></div>
                            Rata-Rata Biaya
                          </span>
                          <span className="font-mono font-medium text-xs">
                            Rp {data.avg.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
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
