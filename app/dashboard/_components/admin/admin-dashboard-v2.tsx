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
import { RealisasiChartWidget } from "./realisasi-chart-widget";
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
  period,
}: {
  kpi: AdminKpiMetric;
  brand: StoreBrandFilter;
  period: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ringkasan Operasional
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Monitor status laporan, realisasi biaya, performa cabang, dan antrian
          PJUM tahun berjalan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AdminTrendPeriodFilter
          initialPeriod={period}
          showBrandFilter={false}
          showPeriodFilter={true}
        />
        <div className="hidden sm:block h-5 w-px bg-border" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/dashboard/activity">
              <Activity className="h-3.5 w-3.5 mr-1" />
              Aktivitas
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href={withBrandHref("/dashboard/reports", brand)}>
              <FileText className="h-3.5 w-3.5 mr-1" />
              Semua Laporan
            </Link>
          </Button>
        </div>
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
          showPeriodFilter={false}
        />
      }
    >
      <DashboardHeader kpi={data.kpi} brand={selectedBrand} period={selectedPeriod} />

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
      <RealisasiChartWidget initialData={realisasiData} brand={selectedBrand} />

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
