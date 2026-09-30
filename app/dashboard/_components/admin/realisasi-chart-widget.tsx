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
import type { AdminRealisasiDetail, RealisasiBranchStat } from "../../queries";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

type RealisasiChartWidgetProps = {
  initialData: AdminRealisasiDetail;
  brand: StoreBrandFilter;
  mode?: "branch" | "bms";
};

export function RealisasiChartWidget({
  initialData,
  brand,
  mode = "branch",
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

  const chartData = mode === "bms" ? data.byBMS : data.byBranch;
  const sortedData = [...chartData].sort((a: any, b: any) => {
    if (mode === "bms") {
      return a.bmsName.localeCompare(b.bmsName);
    }
    return a.branchName.localeCompare(b.branchName);
  });

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
              biaya per laporan di setiap {mode === "bms" ? "BMS/Teknisi" : "cabang"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = sortedData.map((item: any) => ({
                  [mode === "bms" ? "BMS" : "Cabang"]: mode === "bms" ? item.bmsName : item.branchName,
                  "Jumlah Laporan (Total)": item.count,
                  "Jumlah Laporan (Ada Biaya)": item.validCount,
                  "Total Realisasi": item.total,
                  "Rata-Rata Biaya": item.avg,
                }));
                const worksheet = XLSX.utils.json_to_sheet(rows);
                
                // Apply accounting format to currency columns (D and E)
                const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:E1");
                // Start from row 1 (skipping header)
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                  const totalCell = worksheet[XLSX.utils.encode_cell({ c: 3, r: R })];
                  if (totalCell) totalCell.z = '[$Rp-id-ID] #,##0';
                  
                  const avgCell = worksheet[XLSX.utils.encode_cell({ c: 4, r: R })];
                  if (avgCell) avgCell.z = '[$Rp-id-ID] #,##0';
                }

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
              dataKey={mode === "bms" ? "bmsName" : "branchName"}
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
              cursor={false}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  // data = { count, validCount, total, avg, ... }
                  const data = payload[0].payload as any;
                  return (
                    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-xl min-w-[280px] animate-in fade-in zoom-in-95 duration-200">
                      <div className="text-[14px] font-bold tracking-tight text-foreground mb-3 flex items-center gap-2">
                        <span className="w-2 h-5 rounded-sm bg-primary/20 block" />
                        {label}
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {/* Group 1: Report Counts */}
                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-muted/50">
                          <div className="flex w-full justify-between items-center gap-4">
                            <span className="text-muted-foreground text-[13px] flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-count)] shadow-sm"></div>
                              Total Laporan
                            </span>
                            <span className="font-semibold text-[13px] text-foreground">{data.count}</span>
                          </div>
                          <div className="flex w-full justify-between items-center gap-4">
                            <span className="text-muted-foreground text-[13px] flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/80 shadow-sm"></div>
                              Laporan Ada Biaya
                            </span>
                            <span className="font-semibold text-[13px] text-foreground">{data.validCount}</span>
                          </div>
                        </div>

                        {/* Group 2: Costs */}
                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-muted/50">
                          <div className="flex w-full justify-between items-center gap-4">
                            <span className="text-muted-foreground text-[13px] flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-[2px] bg-transparent"></div>
                              Total Realisasi
                            </span>
                            <span className="font-mono font-medium text-[13px] text-foreground">
                              Rp {data.total.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex w-full justify-between items-center gap-4">
                            <span className="text-muted-foreground text-[13px] flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-[2px] bg-[#f4bb44] shadow-sm"></div>
                              Rata-Rata Biaya
                            </span>
                            <span className="font-mono font-semibold text-[13px] text-foreground">
                              Rp {data.avg.toLocaleString("id-ID")}
                            </span>
                          </div>
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
