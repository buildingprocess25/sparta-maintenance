import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleDollarSign, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { formatDashboardCurrency } from "@/lib/utils";
import type { AdminKpiMetric, AdminPjumSummary } from "@/app/dashboard/queries";

function withBrandHref(href: string, brand: StoreBrandFilter) {
    if (brand === "ALL") return href;
    return `${href}${href.includes("?") ? "&" : "?"}brand=${brand}`;
}

function formatNumber(value: number): string {
    return value.toLocaleString("id-ID");
}

function formatRp(value: number): string {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatShortRp(value: number): string {
    return formatDashboardCurrency(value);
}

export function KpiGrid({
    kpi,
    pjum,
    breakdown,
    isBrandFiltered,
    brand,
}: {
    kpi: AdminKpiMetric;
    pjum: AdminPjumSummary;
    breakdown?: {
        alfamart: { kpi: AdminKpiMetric };
        lawson: { kpi: AdminKpiMetric };
    };
    isBrandFiltered: boolean;
    brand: StoreBrandFilter;
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <GroupedKpiCard
                title="Laporan"
                icon={FileText}
                href={withBrandHref("/dashboard/reports", brand)}
                value={formatNumber(kpi.totalReports)}
                helper="Semua laporan non-draft tahun berjalan"
                rows={[
                    {
                        label: "Selesai",
                        value: formatNumber(kpi.completedReports),
                        href: withBrandHref("/dashboard/reports?status=COMPLETED", brand),
                        tone: "green",
                    },
                    {
                        label: "Laporan Aktif",
                        value: formatNumber(kpi.activeReports),
                        href: withBrandHref("/dashboard/reports?scope=active", brand),
                        tone: "blue",
                    },
                    {
                        label: "Ditolak",
                        value: formatNumber(kpi.rejectedReports),
                        href: withBrandHref("/dashboard/reports?status=ESTIMATION_REJECTED", brand),
                        tone: "slate",
                    },
                    {
                        label: isBrandFiltered
                            ? "User Aktif (semua brand)"
                            : "User Aktif",
                        value: formatNumber(kpi.activeUsers),
                        href: "/dashboard/activity/online",
                        tone: "slate",
                    },
                ]}
                breakdown={
                    breakdown
                        ? {
                              alfamart: formatNumber(breakdown.alfamart.kpi.totalReports),
                              lawson: formatNumber(breakdown.lawson.kpi.totalReports),
                          }
                        : undefined
                }
            />
            <GroupedKpiCard
                title="Penyelesaian"
                icon={CheckCircle2}
                href={withBrandHref("/dashboard/reports?status=COMPLETED", brand)}
                value={`${kpi.completionRate}%`}
                helper="Selesai dibanding seluruh laporan non-draft"
                progress={kpi.completionRate}
                rows={[
                    {
                        label: "Selesai",
                        value: formatNumber(kpi.completedReports),
                        tone: "green",
                    },
                    {
                        label: "Sudah PJUM",
                        value: formatNumber(kpi.pjumCompletedReports),
                        href: withBrandHref("/dashboard/reports?status=COMPLETED&pjumStatus=exported", brand),
                        tone: "blue",
                    },
                    {
                        label: "Belum PJUM",
                        value: formatNumber(kpi.unpjumCompletedReports),
                        href: withBrandHref("/dashboard/reports?status=COMPLETED&pjumStatus=not_exported", brand),
                        tone:
                            kpi.unpjumCompletedReports > 0 ? "amber" : "green",
                    },
                    {
                        label: "Tanpa PJUM",
                        value: formatNumber(kpi.unpjumNotRequiredReports),
                        tone: "slate",
                    },
                ]}
                breakdown={
                    breakdown
                        ? {
                              alfamart: `${breakdown.alfamart.kpi.completionRate}%`,
                              lawson: `${breakdown.lawson.kpi.completionRate}%`,
                          }
                        : undefined
                }
            />
            <GroupedKpiCard
                title="Realisasi & PJUM"
                icon={CircleDollarSign}
                href={withBrandHref("/dashboard/realisasi", brand)}
                value={formatShortRp(kpi.totalRealisasi)}
                helper={`BMS / minggu all cabang ${formatRp(kpi.avgBmsWeeklyRealisasi)}`}
                rows={[
                    {
                        label: "PJUM tahun ini",
                        value: formatNumber(pjum.total),
                        href: "/dashboard/pjum",
                        tone: "blue",
                    },
                    {
                        label: "PJUM disetujui",
                        value: formatNumber(pjum.approved),
                        href: "/dashboard/pjum?status=APPROVED",
                        tone: "green",
                    },
                    {
                        label: "Review PJUM",
                        value: formatNumber(pjum.pending),
                        href: "/dashboard/pjum?status=PENDING_APPROVAL",
                        tone: pjum.pending > 0 ? "amber" : "slate",
                    },
                ]}
                breakdown={
                    breakdown
                        ? {
                              alfamart: formatShortRp(breakdown.alfamart.kpi.totalRealisasi),
                              lawson: formatShortRp(breakdown.lawson.kpi.totalRealisasi),
                          }
                        : undefined
                }
            />
        </div>
    );
}

type GroupedKpiRow = {
    label: string;
    value: string;
    href?: string;
    tone?: "blue" | "green" | "amber" | "red" | "slate";
};

const groupedKpiToneClass: Record<
    NonNullable<GroupedKpiRow["tone"]>,
    string
> = {
    blue: "text-sky-700",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    slate: "text-slate-700",
};

function GroupedKpiCard({
    title,
    icon: Icon,
    value,
    helper,
    href,
    rows,
    progress,
    breakdown,
}: {
    title: string;
    icon: React.ElementType;
    value: string;
    helper: string;
    href: string;
    rows: GroupedKpiRow[];
    progress?: number;
    breakdown?: { alfamart: string; lawson: string };
}) {
    return (
        <section className="flex h-full flex-col rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {title}
                    </div>
                    <Link
                        href={href}
                        className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                        {value}
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    {breakdown && (
                        <div className="mt-1 flex items-center gap-3 text-xs font-medium">
                            <span className="text-red-600">Alfamart: {breakdown.alfamart}</span>
                            <span className="text-blue-600">Lawson: {breakdown.lawson}</span>
                        </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        {helper}
                    </p>
                </div>
            </div>

            <div className="mt-4 h-2">
                {typeof progress === "number" ? (
                    <Progress value={progress} />
                ) : null}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4">
                {rows.map((row) => (
                    <KpiSubMetric key={row.label} row={row} />
                ))}
            </div>
        </section>
    );
}

function KpiSubMetric({ row }: { row: GroupedKpiRow }) {
    const tone = groupedKpiToneClass[row.tone ?? "slate"];
    const content = (
        <div className="min-w-0">
            <div className="truncate text-[11px] font-medium text-muted-foreground/80">
                {row.label}
            </div>
            <div
                className={`mt-1 inline-flex items-center gap-1 text-lg font-semibold leading-none ${tone}`}
            >
                {row.value}
                {row.href ? (
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                ) : null}
            </div>
        </div>
    );

    if (!row.href) return content;

    return (
        <Link href={row.href} className="rounded-md hover:bg-muted/40">
            {content}
        </Link>
    );
}
