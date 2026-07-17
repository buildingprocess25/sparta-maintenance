"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  AlertTriangle,
  Printer,
  WrenchIcon,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import { BmsMobileHeader } from "@/components/bms-mobile/bms-mobile-header";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import {
  getReportStatusLabel,
  getReportStatusBadgeClass,
} from "@/lib/report-status";
import { formatJakartaDateTime } from "@/lib/time";
import { checklistCategories, getChecklistItemMeta } from "@/lib/checklist-data";
import {
  normalizePhotoUrl,
  normalizePhotoUrls,
  resolvePhotoUrl,
} from "@/lib/storage/photo-url";
import { calculateItemRealisasiTotal } from "@/lib/realisasi";
import { cn } from "@/lib/utils";
import type { ReportData, Viewer, ActivityEntry } from "./_components/types";
import type { RealisasiItemJson } from "@/types/report";

export type { ReportData };

type ReportDetailProps = {
  report: ReportData;
  viewer: Viewer;
};

/* ─── Tab definition ─── */
type TabKey = "checklist" | "biaya" | "riwayat";
const TABS: { key: TabKey; label: string }[] = [
  { key: "checklist", label: "Checklist" },
  { key: "biaya", label: "Biaya" },
  { key: "riwayat", label: "Riwayat" },
];

/* ─── Currency formatting ─── */
function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
/* ─── Condition indicator ─── */
function ConditionBadge({
  id,
  condition,
  preventive,
  isPreventive,
}: {
  id: string;
  condition: string | null | undefined;
  preventive: string | null | undefined;
  isPreventive: boolean;
}) {
  const isOk =
    preventive === "OK" ||
    (isPreventive && condition === "BAIK") ||
    (!isPreventive && condition === "BAIK");
  const isBad = preventive === "NOT_OK" || condition === "RUSAK";
  const isMissing = preventive === "TIDAK_ADA" || condition === "TIDAK_ADA";

  let colorClass = "bg-muted/50 text-muted-foreground border-border/50";
  if (isBad) colorClass = "bg-amber-100 text-amber-800 border-amber-200/60";
  else if (isOk)
    colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200/60";
  else if (isMissing)
    colorClass = "bg-muted text-muted-foreground border-border/50";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 rounded text-[10px] font-bold px-1.5 py-0.5 border min-w-[28px]",
        colorClass,
      )}
    >
      {id}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function ReportDetailView({ report, viewer }: ReportDetailProps) {
  const [tab, setTab] = useState<TabKey>("checklist");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const closeLightbox = useHistoryBackClose(!!lightboxSrc, () =>
    setLightboxSrc(null),
  );

  const isHeaderVisible = useBmsMobileHeaderVisibility();

  const showCompletion = [
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
  ].includes(report.status);

  /* Revision info */
  const isRevision =
    report.status === "ESTIMATION_REJECTED_REVISION" ||
    report.status === "REVIEW_REJECTED_REVISION";
  const latestRevision = isRevision
    ? [...report.activities]
        .reverse()
        .find(
          (a) =>
            a.action === "ESTIMATION_REJECTED_REVISION" ||
            a.action === "REVIEW_REJECTED_REVISION" ||
            a.action === "WORK_REJECTED_REVISION" ||
            a.action === "FINAL_REJECTED_REVISION_BNM",
        )
    : null;

  /* CTA logic */
  const canReviseEstimation =
    viewer.role === "BMS" &&
    (report.status === "ESTIMATION_REJECTED_REVISION" ||
      report.status === "REVIEW_REJECTED_REVISION");
  const canStartWork =
    viewer.role === "BMS" && report.status === "ESTIMATION_APPROVED";
  const canSubmitCompletion =
    viewer.role === "BMS" &&
    (report.status === "IN_PROGRESS" ||
      report.status === "REVIEW_REJECTED_REVISION");

  return (
    <div className="min-h-svh bg-background">
      {/* ── HEADER (fixed via BmsMobileHeader internals) ── */}
      <BmsMobileHeader
        title="Detail Laporan"
        showBackButton
        backHref="/reports"
      />

      {/* ── Info bar + Tabs — fixed below header ── */}
      <div
        className={cn(
          "fixed top-[56px] inset-x-0 z-30 bg-background transition-transform duration-300 ease-out will-change-transform border-b border-border/40 shadow-sm shadow-black/5",
          isHeaderVisible ? "translate-y-0" : "-translate-y-[56px]",
        )}
      >
        {/* Report info bar */}
        <div className="mx-auto max-w-lg px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {report.storeName}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {report.reportNumber}
            </p>
          </div>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-1 rounded-full shrink-0",
              getReportStatusBadgeClass(report.status),
            )}
          >
            {getReportStatusLabel(report.status)}
          </span>
        </div>

        {/* Tab bar */}
        <nav className="mx-auto max-w-lg flex" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold text-center transition-colors relative",
                tab === t.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 inset-x-4 h-[2px] bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Spacer for fixed header + info + tabs (56px header + 48px info + 40px tabs = 144px) */}
      <div className="h-[144px]" />

      <main className="mx-auto w-full max-w-lg pb-28">
        {/* ── Revision banner ── */}
        {latestRevision && latestRevision.notes && (
          <div className="px-4 pt-3 mt-4">
            <div className="flex gap-3 items-start bg-amber-50 border border-amber-200/60 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-900">
                  Catatan revisi dari {latestRevision.actorName}
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed whitespace-pre-wrap">
                  {latestRevision.notes}
                </p>
                <p className="text-[10px] text-amber-600/70 mt-1.5 font-mono">
                  {formatJakartaDateTime(latestRevision.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── PDF link ── */}
        {report.status === "COMPLETED" && report.completedPdfPath && (
          <div className="px-4 pt-3 mt-4">
            <a
              href={
                report.completedPdfPath.startsWith("https://")
                  ? report.completedPdfPath
                  : `/api/reports/${encodeURIComponent(report.reportNumber)}/pdf?fallback=1&v=${report.updatedAt.getTime()}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border/40 p-3 hover:bg-muted/30 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Printer className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Laporan Lengkap</p>
                  <p className="text-[10px] text-muted-foreground">
                    Buka file PDF
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </a>
          </div>
        )}

        {/* ── Tab content ── */}
        <div className="px-4 pt-3">
          {tab === "checklist" && (
            <ChecklistPanel items={report.items} onPhoto={setLightboxSrc} />
          )}
          {tab === "biaya" &&
            (showCompletion ? (
              <CompletionPanel report={report} onPhoto={setLightboxSrc} />
            ) : (
              <EstimationsPanel
                estimations={report.estimations}
                total={report.totalEstimation}
              />
            ))}
          {tab === "riwayat" && <HistoryPanel activities={report.activities} />}
        </div>
      </main>

      {/* ── Sticky CTA ── */}
      {(canStartWork || canSubmitCompletion || canReviseEstimation) && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/60 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="mx-auto max-w-lg flex flex-col gap-2">
            {canReviseEstimation && (
              <Button asChild size="lg" className="w-full" variant="outline">
                <Link href={`/reports/revisi/${report.reportNumber}`} className="text-amber-600 hover:text-amber-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Revisi Estimasi
                </Link>
              </Button>
            )}
            {canStartWork && (
              <Button asChild size="lg" className="w-full">
                <Link href={`/reports/${report.reportNumber}/start`}>
                  <WrenchIcon className="h-4 w-4 mr-2" />
                  Mulai Pekerjaan
                </Link>
              </Button>
            )}
            {canSubmitCompletion && (
              <Button
                asChild
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link href={`/reports/${report.reportNumber}/completion`}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Kirim Penyelesaian
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="Foto"
              className="w-full h-full object-contain rounded-lg max-h-[85vh]"
            />
            <button
              onClick={closeLightbox}
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════
   CHECKLIST PANEL — flat list, grouped by category
   No Collapsible. Just section headers + flat rows.
   ═══════════════════════════════════════════════════════════════ */
function ChecklistPanel({
  items,
  onPhoto,
}: {
  items: ReportData["items"];
  onPhoto: (src: string) => void;
}) {
  const [filter, setFilter] = useState<string>("semua");

  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        Tidak ada data checklist.
      </div>
    );
  }

  const filterOptions = [
    { id: "semua", label: "Semua" },
    { id: "rusak", label: "Rusak" },
    { id: "foto", label: "Ada Foto" },
    { id: "bms", label: "BMS" },
    { id: "rekanan", label: "Rekanan" },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* ── Filter Chips ── */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 py-3 mb-1 border-b border-border/40">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              filter === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {checklistCategories.map((cat) => {
        const visibleItems = cat.items.filter((ci) => {
          const ri = items.find((i) => i.itemId === ci.id);
          const condition = ri?.condition;
          const preventive = ri?.preventiveCondition;

          // Skip empty preventive items unconditionally
          if (cat.isPreventive && !condition && !preventive) return false;

          if (filter === "semua") return true;

          const isDamaged = condition === "RUSAK" || preventive === "NOT_OK";
          if (filter === "rusak") return isDamaged;

          const photos = ri?.images || (ri?.photoUrl ? [ri.photoUrl] : []);
          if (filter === "foto") return photos.filter(Boolean).length > 0;

          if (filter === "bms") return ri?.handler === "BMS";
          if (filter === "rekanan") return ri?.handler === "REKANAN";

          return true;
        });

        if (visibleItems.length === 0) return null;

        const damagedCount = visibleItems.filter((ci) => {
          const ri = items.find((i) => i.itemId === ci.id);
          return (
            ri?.condition === "RUSAK" || ri?.preventiveCondition === "NOT_OK"
          );
        }).length;

        return (
          <section key={cat.id}>
            {/* Section header — flat, no card */}
            <div className="flex items-center justify-between py-2.5 mt-3 first:mt-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {cat.title}
              </h3>
              {damagedCount > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {damagedCount} rusak
                </span>
              )}
            </div>

            {/* Items — flat divider rows */}
            <div className="border-t border-border/40">
              {visibleItems.map((ci) => {
                const ri = items.find((i) => i.itemId === ci.id);
                const condition = ri?.condition;
                const preventive = ri?.preventiveCondition;
                const isDamaged =
                  condition === "RUSAK" || preventive === "NOT_OK";
                const photos =
                  ri?.images || (ri?.photoUrl ? [ri.photoUrl] : []);

                return (
                  <div
                    key={ci.id}
                    className={cn(
                      "py-2.5 border-b border-border/40 flex gap-3",
                      isDamaged && "bg-amber-50/50",
                    )}
                  >
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <ConditionBadge
                          id={ci.id}
                          condition={condition}
                          preventive={preventive}
                          isPreventive={!!cat.isPreventive}
                        />
                        <span className="text-sm text-foreground flex-1 leading-snug">
                          {ci.name}
                        </span>
                      </div>

                      {(ri?.notes || ri?.ahoTicketNumber) && (
                        <div className="text-xs text-muted-foreground mt-1 ml-[38px] flex flex-col gap-1.5">
                          {ri?.notes && <span className="italic">{ri.notes}</span>}
                          {ri?.ahoTicketNumber && (
                            <span className="text-[10px] font-mono bg-muted/50 border border-border/40 w-fit px-1.5 py-0.5 rounded font-medium">
                              AHO: {ri.ahoTicketNumber}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Photos */}
                    {photos.filter(Boolean).length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                        {photos.filter(Boolean).map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              onPhoto(resolvePhotoUrl(normalizePhotoUrl(url!)))
                            }
                            className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolvePhotoUrl(normalizePhotoUrl(url!))}
                              alt="Foto"
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ESTIMATIONS PANEL
   ═══════════════════════════════════════════════════════════════ */
function EstimationsPanel({
  estimations,
  total,
}: {
  estimations: ReportData["estimations"];
  total: number;
}) {
  if (estimations.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        Tidak ada estimasi material.
      </div>
    );
  }

  return (
    <div>
      {/* Total row */}
      <div className="flex items-center justify-between py-3 border-b border-border/40">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          Total Estimasi
        </span>
        <span className="text-base font-bold font-mono text-primary">
          {fmt(total)}
        </span>
      </div>

      {/* Item rows */}
      {estimations.map((est, i) => (
        <div
          key={i}
          className="py-3 border-b border-border/40 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">
              {est.materialName}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {est.quantity} {est.unit} × {fmt(est.price)}
            </p>
          </div>
          <span className="text-sm font-semibold font-mono text-foreground ml-3 shrink-0">
            {fmt(est.totalPrice)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPLETION PANEL
   ═══════════════════════════════════════════════════════════════ */
function CompletionPanel({
  report,
  onPhoto,
}: {
  report: ReportData;
  onPhoto: (src: string) => void;
}) {
  const selfieUrls = normalizePhotoUrls(report.startSelfieUrls)
    .map(resolvePhotoUrl)
    .filter(Boolean);
  const receiptUrls = normalizePhotoUrls(report.startReceiptUrls)
    .map(resolvePhotoUrl)
    .filter(Boolean);
  const addlPhotos = normalizePhotoUrls(report.completionAdditionalPhotos)
    .map(resolvePhotoUrl)
    .filter(Boolean);

  const damagedItems = report.items.filter(
    (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Bukti Foto Section */}
      {(selfieUrls.length > 0 || receiptUrls.length > 0) && (
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2.5">
            Bukti Persiapan
          </h3>
          <div className="border-t border-border/40">
            {selfieUrls.length > 0 && (
              <div className="py-3 border-b border-border/40 flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Selfie</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                  {selfieUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => onPhoto(url)}
                      className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Foto"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {receiptUrls.length > 0 && (
              <div className="py-3 border-b border-border/40 flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Nota / Kwitansi
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                  {receiptUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => onPhoto(url)}
                      className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Foto"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Toko Material */}
      {report.startMaterialStores.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2.5 mt-3">
            Toko Material
          </h3>
          <div className="border-t border-border/40">
            {report.startMaterialStores.map((store, i) => {
              const storePhotos = normalizePhotoUrls(store.photoUrls ?? [])
                .map(resolvePhotoUrl)
                .filter(Boolean);

              return (
                <div
                  key={i}
                  className="py-2.5 border-b border-border/40 flex gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{store.name}</p>
                    {store.city && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {store.city}
                      </p>
                    )}
                  </div>
                  {storePhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                      {storePhotos.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPhoto(url)}
                          className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Foto toko material"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Realisasi */}
      {damagedItems.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2.5 mt-3">
            Realisasi Pekerjaan
          </h3>
          <div className="border-t border-border/40">
            {damagedItems.map((item) => {
              const real = calculateItemRealisasiTotal(item);
              const afterPhotos = normalizePhotoUrls(item.afterImages ?? [])
                .map(resolvePhotoUrl)
                .filter(Boolean);

              return (
                <div
                  key={item.itemId}
                  className="py-3 border-b border-border/40 flex gap-3"
                >
                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.itemName || getChecklistItemMeta(item.itemId)?.itemName || item.itemId}
                      </p>
                      {real > 0 && (
                        <span className="text-sm font-bold font-mono text-primary shrink-0 ml-2">
                          {fmt(real)}
                        </span>
                      )}
                    </div>

                    {item.realisasiItems && item.realisasiItems.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {item.realisasiItems.map(
                          (mat: RealisasiItemJson, mi: number) => (
                            <div
                              key={mi}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground truncate mr-2">
                                {mat.materialName}
                                <span className="ml-1 text-muted-foreground/60">
                                  ({mat.quantity} {mat.unit})
                                </span>
                              </span>
                              <span className="text-foreground font-mono shrink-0">
                                {fmt(mat.totalPrice)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Photos */}
                  {afterPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                      {afterPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPhoto(url)}
                          className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Foto"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Additional */}
      {(addlPhotos.length > 0 || report.completionAdditionalNote) && (
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide py-2.5 mt-3">
            Tambahan
          </h3>
          <div className="border-t border-border/40 py-3 flex gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Catatan Tambahan
              </p>
              {report.completionAdditionalNote && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {report.completionAdditionalNote}
                </p>
              )}
            </div>
            {addlPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5 [direction:rtl]">
                {addlPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPhoto(url)}
                    className="h-20 w-20 rounded-md overflow-hidden border border-border/40 shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Foto"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY PANEL — timeline
   ═══════════════════════════════════════════════════════════════ */
const HISTORY_LABELS: Record<
  string,
  { label: string; tone: "pos" | "neg" | "neutral" }
> = {
  SUBMITTED: { label: "Laporan Dikirim", tone: "pos" },
  RESUBMITTED_ESTIMATION: { label: "Estimasi Dikirim Ulang", tone: "pos" },
  RESUBMITTED_WORK: { label: "Pekerjaan Dikirim Ulang", tone: "pos" },
  WORK_STARTED: { label: "Mulai Pekerjaan", tone: "pos" },
  COMPLETION_SUBMITTED: { label: "Penyelesaian Dikirim", tone: "pos" },
  ESTIMATION_APPROVED: { label: "Estimasi Disetujui", tone: "pos" },
  ESTIMATION_REJECTED_REVISION: {
    label: "Estimasi Diminta Revisi",
    tone: "neg",
  },
  ESTIMATION_REJECTED: { label: "Estimasi Ditolak", tone: "neg" },
  WORK_APPROVED: { label: "Pekerjaan Disetujui", tone: "pos" },
  WORK_REJECTED_REVISION: { label: "Pekerjaan Diminta Revisi", tone: "neg" },
  FINAL_APPROVED_BNM: { label: "Final Disetujui BNM", tone: "pos" },
  FINAL_REJECTED_REVISION_BNM: { label: "Final Ditolak BNM", tone: "neg" },
};

function HistoryPanel({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        Belum ada riwayat.
      </div>
    );
  }

  const sorted = [...activities].reverse();

  return (
    <div className="relative mt-4 ml-3 border-l border-border/40 pl-4">
      {sorted.map((entry, i) => {
        const cfg = HISTORY_LABELS[entry.action] ?? {
          label: entry.action,
          tone: "neutral" as const,
        };
        const dotColor =
          cfg.tone === "pos"
            ? "bg-emerald-500"
            : cfg.tone === "neg"
              ? "bg-amber-500"
              : "bg-muted-foreground/40";

        return (
          <div key={i} className="pb-5 last:pb-0 relative">
            <span
              className={cn(
                "absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                dotColor,
              )}
            />
            <p className="text-sm font-medium text-foreground">{cfg.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {entry.actorName} · {formatJakartaDateTime(entry.createdAt)}
            </p>
            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 bg-muted/30 rounded-md p-2 italic leading-relaxed">
                &ldquo;{entry.notes}&rdquo;
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
