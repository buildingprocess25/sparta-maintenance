"use client";

import Image from "next/image";
import { AlertTriangle, CheckCircle2, FileCheck2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ChecklistItem,
  REPORT_CHECKLIST_ITEMS,
} from "@/lib/checklist-data";
import type { StoreOption } from "./types";
import type { BmsItemGroup } from "./types";
import { formatCurrency } from "@/lib/utils";

interface ReviewStepProps {
  store: StoreOption | undefined;
  isRepairOnlyMode: boolean;
  checklist: Map<string, ChecklistItem>;
  bmsItems: Map<string, BmsItemGroup>;
  grandTotalBms: number;
}

const CHECKLIST_ASSIGNEE_LABELS: Record<string, string> = {
  BMS: "BMS",
  Rekanan: "Rekanan",
};

const getBrandLogo = (brand: string | null | undefined, storeName: string) => {
  const lowerName = storeName.toLowerCase();
  const isLawson =
    lowerName.includes("lawson") || brand?.toLowerCase().includes("lawson");
  const isMidi =
    lowerName.includes("midi") || brand?.toLowerCase().includes("midi");

  if (isLawson || isMidi) {
    return {
      src: "/assets/Building-Logo.png",
      alt: "Store Logo",
      containerClassName: "bg-primary/5",
    };
  }

  return {
    src: "/assets/logoalfamart.png",
    alt: "Logo Alfamart",
    containerClassName: "bg-primary/5",
  };
};

export function ReviewStep({
  store,
  isRepairOnlyMode,
  checklist,
  bmsItems,
  grandTotalBms,
}: ReviewStepProps) {
  const brandLogo = store ? getBrandLogo(store.brand, store.name) : undefined;

  const evaluatedChecklistCount = Array.from(checklist.values()).filter(
    (val) => (isRepairOnlyMode ? val.condition === "rusak" : val.condition),
  ).length;

  const checklistProgress =
    REPORT_CHECKLIST_ITEMS.length > 0
      ? Math.round(
          (evaluatedChecklistCount / REPORT_CHECKLIST_ITEMS.length) * 100,
        )
      : 0;

  const goodCount = Array.from(checklist.values()).filter(
    (i) => i.condition === "baik",
  ).length;
  const brokenCount = Array.from(checklist.values()).filter(
    (i) => i.condition === "rusak",
  ).length;
  const noneCount = Array.from(checklist.values()).filter(
    (i) => i.condition === "tidak_ada",
  ).length;

  const reviewSummaryItems = [
    { label: "Baik", value: goodCount, className: "text-primary" },
    { label: "Rusak", value: brokenCount, className: "text-destructive" },
    {
      label: "Tidak Ada",
      value: noneCount,
      className: "text-muted-foreground",
    },
  ];

  const brokenChecklistItems = Array.from(checklist.values()).filter(
    (i) => i.condition === "rusak",
  );
  const totalEstimateEntries = Array.from(bmsItems.values()).reduce(
    (acc, group) => acc + group.entries.length,
    0,
  );

  return (
    <>
      <section className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">
          Review Laporan
        </h2>
        <p className="text-sm text-muted-foreground">
          Periksa kembali ringkasan laporan sebelum dikirim ke BMC.
        </p>
      </section>

      <Card size="sm" className="bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {brandLogo ? (
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60",
                    brandLogo.containerClassName,
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandLogo.src}
                    alt={brandLogo.alt}
                    className="max-h-9 w-auto object-contain"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1 text-[10px]">
                  {store?.code}
                </Badge>
                <h3 className="truncate text-base font-semibold">
                  {store?.name}
                </h3>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isRepairOnlyMode ? (
        <Card size="sm" className="bg-muted/40 shadow-none ring-0">
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <FileCheck2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-semibold">
                    Checklist
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {evaluatedChecklistCount} dari{" "}
                    {REPORT_CHECKLIST_ITEMS.length} item dievaluasi
                  </p>
                </div>
              </div>

              <div
                className="grid size-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--primary) ${checklistProgress * 3.6}deg, var(--muted) 0deg)`,
                }}
              >
                <div className="grid size-12 place-items-center rounded-full bg-card">
                  <span className="text-sm font-bold text-primary">
                    {checklistProgress}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {reviewSummaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-background/80 p-3 text-center ring-1 ring-border/60"
                >
                  <p
                    className={cn(
                      "text-lg leading-none font-black",
                      item.className,
                    )}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm" className="bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-semibold">
                  Item Rusak
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rincian item yang perlu ditindaklanjuti.
                </p>
              </div>
              <Badge variant="secondary">
                {brokenChecklistItems.length} Item
              </Badge>
            </div>

            {brokenChecklistItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 size-7 text-primary" />
                <p className="text-sm font-semibold">Tidak ada item rusak</p>
                <p className="text-xs text-muted-foreground">
                  Laporan akan dikirim sebagai checklist kondisi.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {brokenChecklistItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.id}
                        </Badge>
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Handler: {CHECKLIST_ASSIGNEE_LABELS[item.handler || ""]}
                      </p>
                    </div>
                    <AlertTriangle className="size-5 shrink-0 text-destructive" />
                  </div>
                ))}

                {brokenChecklistItems.length > 5 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    +{brokenChecklistItems.length - 5} item rusak lainnya
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-primary/5 shadow-sm ring-1 ring-primary/15">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold">
                Estimasi BMS
              </h3>
              <p className="text-xs text-muted-foreground">
                {Array.from(bmsItems.keys()).length > 0
                  ? `${totalEstimateEntries} barang estimasi`
                  : "Tidak ada estimasi BMS"}
              </p>
            </div>

            <p className="text-right font-heading text-2xl font-black text-primary">
              {formatCurrency(grandTotalBms)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardContent>
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-lg font-semibold">
              Setelah Submit
            </h3>

            <div className="grid items-center gap-2">
              {(brokenChecklistItems.length === 0
                ? [
                    "Status laporan menjadi 'Pending Review Checklist'.",
                    "BMC melakukan review atas hasil checklist.",
                    "Jika disetujui, laporan diteruskan ke BNM untuk approval akhir.",
                  ]
                : [
                    "Status laporan menjadi 'Menunggu Persetujuan Estimasi'.",
                    "BMC melakukan review estimasi dan checklist.",
                    "Jika disetujui, BMS dapat mulai pekerjaan.",
                  ]
              ).map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
