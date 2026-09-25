"use client";

import type { User } from "@prisma/client";
import type {
  AdminCommandCenterData,
  AdminRealisasiDetail,
  AdminKpiMetric,
} from "../../../queries";
import Link from "next/link";
import { Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "./admin-trend-filter";
import { AdminKpiCards } from "./kpi-cards";
import { LeaderboardList, type LeaderboardItem } from "./leaderboard-list";

import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
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
  user: User;
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

  const maxEstimasiSla = Math.max(
    ...(data.slaPerformance?.estimasiToAppvBmc.map(
      (s) => s.avgDurationHours,
    ) || [1]),
  );
  const estimasiSlaItems: LeaderboardItem[] = (
    data.slaPerformance?.estimasiToAppvBmc || []
  ).map((s) => ({
    label: s.branchName,
    value: s.avgDurationHours,
    valueLabel: s.formattedDuration,
    maxValue: maxEstimasiSla,
    colorClass: "bg-orange-500",
  }));

  const maxPekerjaanSla = Math.max(
    ...(data.slaPerformance?.durasiPekerjaanBms.map(
      (s) => s.avgDurationHours,
    ) || [1]),
  );
  const pekerjaanSlaItems: LeaderboardItem[] = (
    data.slaPerformance?.durasiPekerjaanBms || []
  ).map((s) => ({
    label: s.branchName,
    value: s.avgDurationHours,
    valueLabel: s.formattedDuration,
    maxValue: maxPekerjaanSla,
    colorClass: "bg-[#005ea2]",
  }));

  const maxMgrSla = Math.max(
    ...(data.slaPerformance?.appvBmcToAppvMgr.map(
      (s) => s.avgDurationHours,
    ) || [1]),
  );
  const mgrSlaItems: LeaderboardItem[] = (
    data.slaPerformance?.appvBmcToAppvMgr || []
  ).map((s) => ({
    label: s.branchName,
    value: s.avgDurationHours,
    valueLabel: s.formattedDuration,
    maxValue: maxMgrSla,
    colorClass: "bg-purple-500",
  }));

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
      <AdminKpiCards data={data} />

      {/* Row 2: Status Bottleneck & Preventif */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-sm border-muted/60">
          <CardHeader className="pb-2 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
              Status Bottleneck
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-64 p-4">
            <div className="space-y-3 mt-1 text-sm">
              {data.status.map((s) => (
                <div
                  key={s.status}
                  className="flex justify-between items-center border-b border-muted/40 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground font-medium">
                    {s.label}
                  </span>
                  <span className="font-bold bg-secondary/80 px-2.5 py-0.5 rounded-md text-foreground/80">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-sm border-muted/60">
          <CardHeader className="pb-2 bg-muted/20 border-b">
            <CardTitle className="text-sm font-semibold text-muted-foreground text-center uppercase">
              PENCAPAIAN PREVENTIF
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-56 relative p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "OK", value: 87 },
                    { name: "NOT OK", value: 13 },
                  ]}
                  innerRadius={65}
                  outerRadius={85}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-3xl font-extrabold tracking-tighter mt-8">
              87%
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-1 h-64">
          <LeaderboardList
            title="5 Cabang Preventif Rendah"
            items={preventifItems}
          />
        </div>
      </div>

      {/* Row 3: SLA Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto min-h-64">
        <LeaderboardList
          title="SL Estimasi ke Appv BMC Tertinggi"
          items={estimasiSlaItems}
        />
        <LeaderboardList
          title="SL Durasi Pekerjaan BMS Tertinggi"
          items={pekerjaanSlaItems}
        />
        <LeaderboardList
          title="SL Appv BMC ke Appv Mgr Tertinggi"
          items={mgrSlaItems}
        />
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm font-medium text-muted-foreground uppercase">
              Total Toko Nasional
            </div>
            <div className="text-2xl font-bold mt-2">
              {(data.userStats?.totalStoreAlfamart || 0) +
                (data.userStats?.totalStoreLawson || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm font-medium text-muted-foreground uppercase">
              Total Tim Cabang
            </div>
            <div className="text-2xl font-bold mt-2">
              {data.userStats?.totalTimCabang || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm font-medium text-muted-foreground uppercase">
              Manager Cabang
            </div>
            <div className="text-2xl font-bold mt-2">
              {data.userStats?.totalManagerCabang || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm font-medium text-muted-foreground uppercase">
              Total BMC Cabang
            </div>
            <div className="text-2xl font-bold mt-2">
              {data.userStats?.totalBmc || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm font-medium text-muted-foreground uppercase">
              Total BMS Cabang
            </div>
            <div className="text-2xl font-bold mt-2">
              {data.userStats?.totalBms || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Dana Taktis Line Chart */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-center uppercase">
            Rata-Rata Penggunaan Dana Taktis Per Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={realisasiData.byBranch}
              margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="branchName"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#ef4444"
                tickFormatter={(val) => `Rp ${val / 1000}k`}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                tick={{ fontSize: 10 }}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  name === "avg"
                    ? `Rp ${value.toLocaleString("id-ID")}`
                    : value,
                  name === "avg" ? "AVG BIAYA" : "JUMLAH LAPORAN",
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-semibold">
                    {value === "avg" ? "AVG BIAYA" : "JUMLAH LAPORAN"}
                  </span>
                )}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avg"
                stroke="#ef4444"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </AdminDashboardShell>
  );
}
