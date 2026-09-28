"use client";

import { type AuthUser } from "@/lib/authorization";
import type {
  AdminCommandCenterData,
  AdminRealisasiDetail,
  AdminKpiMetric,
} from "@/app/dashboard/queries";
import Link from "next/link";
import { Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "./admin-trend-filter";
import { KpiGrid } from "./kpi-cards";
import { LeaderboardList, type LeaderboardItem } from "./leaderboard-list";
import { SlaStatusGuide } from "./sla-status-guide";
import { StatusDistributionKpis } from "./status-distribution";
import { PreventiveKpiWidget } from "./preventive-kpi-widget";
import { ProcessDurationWidget } from "./process-duration-widget";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

function withBrandHref(href: string, brand: StoreBrandFilter) {
  if (brand === "ALL") return href;
  return `${href}${href.includes("?") ? "&" : "?"}brand=${brand}`;
}

export function DashboardHeader({
  kpi,
  brand,
}: {
  kpi: AdminKpiMetric;
  brand: StoreBrandFilter;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ringkasan Operasional
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Monitor status laporan, realisasi biaya, performa cabang, dan antrian
          PJUM tahun berjalan.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/activity">
            <Activity className="h-4 w-4" />
            Aktivitas
          </Link>
        </Button>
        <Button asChild>
          <Link href={withBrandHref("/dashboard/reports", brand)}>
            <FileText className="h-4 w-4" />
            Semua Laporan
          </Link>
        </Button>
      </div>
      <div className="sr-only">Completion rate {kpi.completionRate} persen</div>
    </div>
  );
}

type AdminDashboardV2Props = {
  user: AuthUser;
  data: AdminCommandCenterData;
  realisasiData: AdminRealisasiDetail;
  period?: string;
  brand?: string;
};

export function AdminDashboardV2({
  user,
  data,
  realisasiData,
  period,
  brand,
}: AdminDashboardV2Props) {
  const selectedPeriod = period ? period : "ytd";
  const selectedBrand = normalizeStoreBrandFilter(brand);

  // Mock data for preventif as it was hardcoded in the original file
  const preventifItems: LeaderboardItem[] = [
    {
      label: "PONTIANAK",
      value: 43.4,
      valueLabel: "43,40%",
      maxValue: 100,
      colorClass: "bg-red-500",
    },
    {
      label: "LOMBOK",
      value: 48.8,
      valueLabel: "48,80%",
      maxValue: 100,
      colorClass: "bg-red-500",
    },
    {
      label: "MADIUN",
      value: 58.29,
      valueLabel: "58,29%",
      maxValue: 100,
      colorClass: "bg-orange-500",
    },
  ];

  return (
    <AdminDashboardShell
      user={user}
      title="Dashboard"
      breadcrumbs={[{ label: "Dashboard" }]}
      contentClassName="md:p-6 space-y-6 pb-12"
      headerActions={
        <AdminTrendPeriodFilter
          initialPeriod={selectedPeriod}
          initialBrand={selectedBrand}
          showBrandFilter
        />
      }
    >
      <DashboardHeader kpi={data.kpi} brand={selectedBrand} />

      {/* Row 1: KPI Cards */}
      <KpiGrid
        kpi={data.kpi}
        pjum={data.pjum}
        breakdown={data.brandBreakdown}
        isBrandFiltered={selectedBrand !== "ALL"}
        brand={selectedBrand}
      />

      {/* Row 2: SLA Leaderboards & SLA Guide */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Distribusi Status &amp; SLA
            </h2>
            <p className="text-sm text-muted-foreground">
              Komposisi laporan aktif dan status yang melewati batas waktu
              operasional.
            </p>
          </div>
          <StatusDistributionKpis
            status={data.status}
            breakdown={
              data.brandBreakdown
                ? {
                    alfamart: data.brandBreakdown.alfamart.kpi.activeReports,
                    lawson: data.brandBreakdown.lawson.kpi.activeReports,
                  }
                : undefined
            }
          />
        </div>
        <SlaStatusGuide />
      </section>

      {/* Row 3: Preventif */}
      <PreventiveKpiWidget />
      <ProcessDurationWidget />

      {/* Row 4: Dana Taktis Line Chart */}
      <Card className="w-full">
        <CardHeader className="pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Rata-Rata Realisasi Per Laporan
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Perbandingan antara total jumlah laporan dan rata-rata realisasi biaya per laporan di setiap cabang
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ChartContainer 
            config={{
              count: { label: "Jumlah Laporan", color: "var(--chart-3)" },
              avg: { label: "Rata-Rata Biaya", color: "#f4bb44" }
            }} 
            className="h-full w-full"
          >
            <ComposedChart
              data={[...realisasiData.byBranch].sort((a, b) => a.branchName.localeCompare(b.branchName))}
              margin={{ top: 10, right: 10, bottom: 60, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
                    labelFormatter={(label) => <div className="text-sm font-semibold mb-1">{label}</div>}
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between items-center gap-4">
                        <span className="text-muted-foreground text-xs">
                          {name === "avg" ? "Rata-Rata Biaya" : "Jumlah Laporan"}
                        </span>
                        <span className="font-mono font-medium text-xs">
                          {name === "avg" ? `Rp ${Number(value).toLocaleString("id-ID")}` : value}
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
                wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
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

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
              Total Toko Nasional
            </div>
            <div className="text-3xl font-black tracking-tight">
              {((data.userStats?.totalStoreAlfamart || 0) + (data.userStats?.totalStoreLawson || 0)).toLocaleString("id-ID")}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-medium">
              <span className="text-red-700">
                Alfamart: {(data.userStats?.totalStoreAlfamart || 0).toLocaleString("id-ID")}
              </span>
              <span className="text-sky-700">
                Lawson: {(data.userStats?.totalStoreLawson || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
              Total Tim Cabang
            </div>
            <div className="text-3xl font-black tracking-tight">
              {(data.userStats?.totalTimCabang || 0).toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
              Manager Cabang
            </div>
            <div className="text-3xl font-black tracking-tight">
              {(data.userStats?.totalManagerCabang || 0).toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
              Total BMC Cabang
            </div>
            <div className="text-3xl font-black tracking-tight">
              {(data.userStats?.totalBmc || 0).toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
              Total BMS Cabang
            </div>
            <div className="text-3xl font-black tracking-tight">
              {(data.userStats?.totalBms || 0).toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardShell>
  );
}
