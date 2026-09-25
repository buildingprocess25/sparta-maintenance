import {
  FileText,
  CheckCircle2,
  CircleDollarSign,
  ArrowUpRight,
} from "lucide-react";
import type { AdminCommandCenterData } from "../../../queries";
import { Progress } from "@/components/ui/progress";

export function AdminKpiCards({ data }: { data: AdminCommandCenterData }) {
  const alfamartLaporan = data.brandBreakdown?.alfamart.kpi.totalReports ?? 0;
  const lawsonLaporan = data.brandBreakdown?.lawson.kpi.totalReports ?? 0;

  const alfamartCompletion =
    data.brandBreakdown?.alfamart.kpi.completionRate ?? 0;
  const lawsonCompletion = data.brandBreakdown?.lawson.kpi.completionRate ?? 0;

  const alfamartRealisasi =
    data.brandBreakdown?.alfamart.kpi.totalRealisasi ?? 0;
  const lawsonRealisasi = data.brandBreakdown?.lawson.kpi.totalRealisasi ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1: Laporan */}
      <section className="flex h-full flex-col rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Laporan
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
              {data.kpi.totalReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-medium">
              <span className="text-red-700">
                Alfamart: {alfamartLaporan.toLocaleString("id-ID")}
              </span>
              <span className="text-sky-700">
                Lawson: {lawsonLaporan.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Semua laporan non-draft tahun berjalan
            </p>
          </div>
        </div>

        <div className="mt-4 h-2">
          {/* empty placeholder for alignment if needed, or omit */}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Selesai
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-emerald-700">
              {data.kpi.completedReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Laporan Aktif
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-sky-700">
              {data.kpi.activeReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Ditolak
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-slate-700">
              {data.kpi.rejectedReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              User Aktif
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-slate-700">
              {data.kpi.activeUsers.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* CARD 2: Penyelesaian */}
      <section className="flex h-full flex-col rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Penyelesaian
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
              {data.kpi.completionRate}%
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-medium">
              <span className="text-red-700">
                Alfamart: {alfamartCompletion}%
              </span>
              <span className="text-sky-700">Lawson: {lawsonCompletion}%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Selesai dibanding seluruh laporan non-draft
            </p>
          </div>
        </div>

        <div className="mt-4 h-2">
          <Progress value={data.kpi.completionRate} />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Selesai
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-emerald-700">
              {data.kpi.completedReports.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Sudah PJUM
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-sky-700">
              {data.kpi.pjumCompletedReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Belum PJUM
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-amber-700">
              {data.kpi.unpjumCompletedReports.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Tanpa PJUM
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-slate-700">
              {data.kpi.unpjumNotRequiredReports.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </section>

      {/* CARD 3: Realisasi & PJUM */}
      <section className="flex h-full flex-col rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDollarSign className="h-4 w-4" />
              Realisasi & PJUM
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground truncate max-w-full">
              Rp {data.kpi.totalRealisasi.toLocaleString("id-ID")}
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-medium truncate max-w-full">
              <span className="text-red-700">
                Alfamart: Rp {alfamartRealisasi.toLocaleString("id-ID")}
              </span>
              <span className="text-sky-700">
                Lawson: Rp {lawsonRealisasi.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              BMS / minggu all cabang Rp{" "}
              {data.kpi.avgBmsWeeklyRealisasi.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2">
          {/* empty placeholder for alignment if needed, or omit */}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              PJUM tahun ini
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-sky-700">
              {data.pjum.total.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              PJUM disetujui
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-emerald-700">
              {data.pjum.approved.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
              Review PJUM
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none text-amber-700">
              {data.pjum.pending.toLocaleString("id-ID")}
              <ArrowUpRight className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
