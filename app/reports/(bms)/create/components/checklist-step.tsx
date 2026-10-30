"use client";

import { useMemo, useState } from "react";
import {
  CalendarX2,
  ChevronDown,
  ClipboardCheck,
  InfoIcon,
  Search,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { getLockedAhoTickets } from "@/lib/aho-ticket-groups";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import {
  type ChecklistItem,
  type ChecklistCondition,
  type ChecklistCategory,
} from "@/lib/checklist-data";
import {
  toAhoTicketHolders,
  type SignageChange,
} from "../hooks/signage-checklist";
import { ChecklistPhotoField } from "./checklist-photo-field";
import { ChecklistDamageFields } from "./checklist-damage-fields";
import { SignageChecklistItem } from "./signage-checklist-item";
import { PhotoGuideLink } from "@/components/photo-guide/photo-guide-link";

interface ChecklistStepProps {
  storeCode?: string;
  isRepairOnlyMode: boolean; // mapped from isCategoryICoolingDown (or similar intent)
  /** Opsi lewati preventif tersedia (bulan pertama kuartal, jatah toko belum dipakai). */
  canSkipPreventive: boolean;
  isPreventiveSkipped: boolean;
  onSkipPreventiveChange: (skip: boolean) => void;
  signageAhoRequired: boolean;
  activeCategories: ChecklistCategory[];
  checklist: Map<string, ChecklistItem>;
  onConditionChange: (
    itemId: string,
    itemName: string,
    value: ChecklistCondition,
  ) => void;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
  onAhoTicketNumberChange: (itemId: string, itemName: string, value: string) => void;
  onHandlerChange: (itemId: string, itemName: string, value: string) => void;
  onSignageChange: (
    itemId: string,
    itemName: string,
    change: SignageChange,
  ) => void;
  onOpenCamera: (itemId: string) => void;
  onShowPhotoGuide: (itemId: string) => void;
  onPreviewPhoto: (photo: File | string) => void;
  onRemovePhoto: (itemId: string) => void;
  openCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onDevAutofill?: () => void;
}

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  baik: "Baik",
  rusak: "Rusak",
  tidak_ada: "Tidak Ada",
};

const CHECKLIST_ASSIGNEE_LABELS: Record<string, string> = {
  BMS: "BMS",
  Rekanan: "Rekanan",
};

export function ChecklistStep({
  storeCode,
  isRepairOnlyMode,
  canSkipPreventive,
  isPreventiveSkipped,
  onSkipPreventiveChange,
  signageAhoRequired,
  activeCategories,
  checklist,
  onConditionChange,
  onNotesChange,
  onAhoTicketNumberChange,
  onHandlerChange,
  onSignageChange,
  onOpenCamera,
  onShowPhotoGuide,
  onPreviewPhoto,
  onRemovePhoto,
  openCategories,
  onToggleCategory,
  onDevAutofill,
}: ChecklistStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeCategories;

    return activeCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            cat.title.toLowerCase().includes(query),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [activeCategories, searchQuery]);

  const evaluatedCount = Array.from(checklist.values()).filter((val) =>
    isRepairOnlyMode ? val.condition === "rusak" : val.condition,
  ).length;

  // Total items depends on active categories
  const totalItems = activeCategories.reduce(
    (acc, cat) => acc + cat.items.length,
    0,
  );
  const progress =
    totalItems > 0 ? Math.round((evaluatedCount / totalItems) * 100) : 0;
  const hasSearch = searchQuery.trim().length > 0;

  // Toko sudah preventif I1–I10 kuartal ini tapi signage belum diisi.
  const hasPendingSignage =
    isRepairOnlyMode &&
    !isPreventiveSkipped &&
    activeCategories.some((cat) => cat.items.some((item) => item.signage));

  const ahoTicketHolders = useMemo(
    () => toAhoTicketHolders(checklist),
    [checklist],
  );

  const isHeaderVisible = useBmsMobileHeaderVisibility();

  return (
    <>
      {!isRepairOnlyMode ? (
        <Card size="sm" className="bg-muted/40 shadow-none ring-0">
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ClipboardCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    Checklist Item
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {evaluatedCount} dari {totalItems} item dievaluasi
                  </p>
                </div>
              </div>
              <div
                className="grid size-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--primary) ${progress * 3.6}deg, var(--muted) 0deg)`,
                }}
              >
                <div className="grid size-12 place-items-center rounded-full bg-card">
                  <span className="text-sm font-bold text-primary">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {process.env.NODE_ENV === "development" && onDevAutofill && (
        <Button
          type="button"
          variant="outline"
          className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
          onClick={onDevAutofill}
        >
          Autofill (Dev Mode)
        </Button>
      )}

      <Card
        size="sm"
        className={cn(
          "overflow-hidden shadow-sm ring-1",
          isPreventiveSkipped
            ? "bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
            : "bg-gradient-to-br from-primary/10 via-card to-card ring-primary/20",
        )}
      >
        <CardContent>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                isPreventiveSkipped
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  : "bg-primary/15 text-primary",
              )}
            >
              {isPreventiveSkipped ? (
                <CalendarX2 className="size-5" />
              ) : (
                <InfoIcon className="size-5" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">
                  {isPreventiveSkipped
                    ? "Mode Perbaikan · Preventif dilewati"
                    : isRepairOnlyMode
                      ? "Mode Perbaikan"
                      : "Mode Checklist Wajib"}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isPreventiveSkipped
                    ? "Preventif toko ini dilewati untuk laporan ini. Cukup pilih item yang rusak. Checklist preventif tetap wajib di kunjungan berikutnya kuartal ini."
                    : isRepairOnlyMode
                      ? hasPendingSignage
                        ? "Toko sudah mengisi item preventif I.1–I.10 kuartal ini. Item signage I.11–I.13 tetap wajib diisi sekali; item lain cukup pilih yang rusak."
                        : "Toko sudah mengisi item preventif. Anda cukup memilih item yang rusak dan mengisi detail perbaikannya."
                      : "Toko belum mengisi item preventif. Anda wajib mengevaluasi semua item checklist."}
                </p>
              </div>

              {canSkipPreventive && !isPreventiveSkipped ? (
                <AlertDialog>
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-background/70 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Sedang ada perbaikan urgent atau insidentil? Anda bisa{" "}
                      <span className="font-semibold text-foreground">
                        melewati checklist preventif
                      </span>{" "}
                      dan cukup mengisi item yang rusak. Tersedia di bulan
                      pertama kuartal, sekali per toko.
                    </p>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="sm" className="w-full">
                        <SkipForward data-icon="inline-start" />
                        Lewati Preventif
                      </Button>
                    </AlertDialogTrigger>
                  </div>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Lewati checklist preventif?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Gunakan hanya untuk perbaikan urgent/insidentil. Opsi ini
                        hanya ada di bulan pertama kuartal dan hanya sekali per
                        toko per kuartal. Laporan akan ditandai &quot;Preventif
                        dilewati&quot; untuk BMC dan BNM, dan checklist preventif
                        tetap wajib di kunjungan berikutnya.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onSkipPreventiveChange(true)}>
                        Lewati Preventif
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              {canSkipPreventive && isPreventiveSkipped ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start border-amber-300 bg-background text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
                  onClick={() => onSkipPreventiveChange(false)}
                >
                  <Undo2 data-icon="inline-start" />
                  Batalkan, isi checklist lengkap
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <section
        data-tour="bms-report-checklist"
        className={cn(
          "sticky z-40 -mx-4 px-4 pt-2 pb-0 bg-background/95 backdrop-blur-md transition-all duration-300",
          isHeaderVisible ? "top-[60px]" : "top-0",
        )}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Cari checklist"
            placeholder="Cari kategori atau item checklist"
            className="h-12 rounded-xl bg-muted/70 pr-11 pl-11 font-medium"
          />

          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Hapus pencarian checklist"
              className="absolute top-1/2 right-3 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X />
            </Button>
          ) : null}
        </div>

        {hasSearch ? (
          <p className="px-1 mt-3 text-xs text-muted-foreground">
            {filteredCategories.reduce(
              (total, category) => total + category.items.length,
              0,
            )}{" "}
            item ditemukan
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-3">
        {filteredCategories.map((category) => {
          const evaluatedCategoryCount = category.items.filter((item) => {
            const status = checklist.get(item.id)?.condition;
            return isRepairOnlyMode ? status === "rusak" : status;
          }).length;

          const isOpen = hasSearch || openCategories.has(category.id);

          return (
            <Collapsible
              key={category.id}
              open={isOpen}
              onOpenChange={() => onToggleCategory(category.id)}
            >
              <Card
                size="sm"
                className="bg-card/95 shadow-sm ring-1 ring-border/60"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {category.id}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-heading text-base font-semibold text-foreground">
                          {category.title.replace(/^[A-Z]\.\s*/, "")}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {evaluatedCategoryCount} dari {category.items.length}{" "}
                          {isRepairOnlyMode
                            ? "item rusak dipilih"
                            : "item dievaluasi"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex flex-col gap-3">
                      {category.items.map((item) => {
                        const itemData = checklist.get(item.id);

                        if (item.signage) {
                          return (
                            <SignageChecklistItem
                              key={item.id}
                              item={{ ...item, signage: item.signage }}
                              itemData={itemData}
                              storeCode={storeCode}
                              lockedAhoTickets={getLockedAhoTickets(
                                item.id,
                                ahoTicketHolders,
                              )}
                              signageAhoRequired={signageAhoRequired}
                              onSignageChange={onSignageChange}
                              onNotesChange={onNotesChange}
                              onAhoTicketNumberChange={onAhoTicketNumberChange}
                              onOpenCamera={onOpenCamera}
                              onPreviewPhoto={onPreviewPhoto}
                              onRemovePhoto={onRemovePhoto}
                            />
                          );
                        }

                        const condition = itemData?.condition;
                        const handler = itemData?.handler;

                        const isGood = condition === "baik";
                        const isBroken = condition === "rusak";
                        const isUnavailable = condition === "tidak_ada";
                        const needsPhotoEvidence = isGood || isBroken;

                        return (
                          <Card
                            key={item.id}
                            id={`item-${item.id}`}
                            size="sm"
                            className={cn(
                              "bg-card/95 shadow-sm ring-1 ring-border/60",
                              isBroken && "ring-destructive/45",
                              isUnavailable && "opacity-75",
                            )}
                          >
                            <CardContent>
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3">
                                  <div>
                                    <h4 className="text-base font-semibold">
                                      {item.name}
                                    </h4>
                                    {item.standard ? (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">
                                          Standar baik:
                                        </span>{" "}
                                        {item.standard}
                                      </p>
                                    ) : null}
                                    {item.desc ? (
                                      <p className="text-sm text-muted-foreground">
                                        {item.desc}
                                      </p>
                                    ) : null}
                                    {item.photoGuide ? (
                                      <PhotoGuideLink
                                        onClick={() =>
                                          onShowPhotoGuide(item.id)
                                        }
                                      />
                                    ) : null}
                                  </div>

                                  <RadioGroup
                                    data-tour="bms-checklist-condition"
                                    value={condition || ""}
                                    onValueChange={(value) =>
                                      onConditionChange(
                                        item.id,
                                        item.name,
                                        value as ChecklistCondition,
                                      )
                                    }
                                    className={cn(
                                      "grid gap-1 rounded-xl bg-muted",
                                      isRepairOnlyMode
                                        ? "grid-cols-1"
                                        : "grid-cols-3",
                                    )}
                                  >
                                    {["baik", "rusak", "tidak_ada"].map(
                                      (val) => {
                                        if (
                                          isRepairOnlyMode &&
                                          val !== "rusak" &&
                                          condition !== val
                                        ) {
                                          return null; // hide OK and Tidak Ada if not selected in repair mode
                                        }

                                        return (
                                          <Label
                                            key={val}
                                            htmlFor={`${item.id}-${val}`}
                                            onClick={(e) => {
                                              if (condition === val) {
                                                e.preventDefault();
                                                onConditionChange(
                                                  item.id,
                                                  item.name,
                                                  "" as ChecklistCondition,
                                                );
                                              }
                                            }}
                                            className={cn(
                                              "relative flex h-10 cursor-pointer items-center justify-center gap-0 rounded-lg text-center text-sm leading-none font-semibold transition-colors",
                                              condition === val
                                                ? val === "rusak"
                                                  ? "bg-destructive text-white shadow-sm"
                                                  : val === "baik"
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "bg-neutral-400 text-foreground shadow-sm dark:bg-neutral-700 dark:text-white"
                                                : "text-muted-foreground",
                                            )}
                                          >
                                            <RadioGroupItem
                                              id={`${item.id}-${val}`}
                                              value={val}
                                              className="pointer-events-none absolute opacity-0"
                                            />
                                            <span className="leading-none">
                                              {CHECKLIST_STATUS_LABELS[val]}
                                            </span>
                                          </Label>
                                        );
                                      },
                                    )}
                                  </RadioGroup>
                                </div>

                                {needsPhotoEvidence ? (
                                  <div className="flex flex-col gap-4 border-t border-border/70 pt-4">
                                    {isBroken ? (
                                      <div className="flex flex-col gap-2">
                                        <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                                          akan dihandle{" "}
                                          <span className="text-destructive">
                                            *
                                          </span>
                                        </p>
                                        <RadioGroup
                                          data-tour="bms-checklist-handler"
                                          value={handler || ""}
                                          onValueChange={(val) =>
                                            onHandlerChange(
                                              item.id,
                                              item.name,
                                              val,
                                            )
                                          }
                                          className="grid grid-cols-2 gap-1 rounded-xl bg-muted"
                                        >
                                          {["BMS", "Rekanan"].map((val) => (
                                            <Label
                                              key={val}
                                              htmlFor={`${item.id}-assignee-${val}`}
                                              className={cn(
                                                "relative flex h-10 cursor-pointer items-center justify-center gap-0 rounded-lg text-center text-sm leading-none font-semibold transition-colors",
                                                handler === val
                                                  ? "bg-primary text-primary-foreground shadow-sm"
                                                  : "text-muted-foreground",
                                              )}
                                            >
                                              <RadioGroupItem
                                                id={`${item.id}-assignee-${val}`}
                                                value={val}
                                                className="pointer-events-none absolute opacity-0"
                                              />
                                              <span className="leading-none">
                                                {CHECKLIST_ASSIGNEE_LABELS[val]}
                                              </span>
                                            </Label>
                                          ))}
                                        </RadioGroup>
                                      </div>
                                    ) : null}

                                    <ChecklistPhotoField
                                      itemId={item.id}
                                      photo={itemData?.photo}
                                      photoUrl={itemData?.photoUrl}
                                      onOpenCamera={onOpenCamera}
                                      onPreviewPhoto={onPreviewPhoto}
                                      onRemovePhoto={onRemovePhoto}
                                    />

                                    {isBroken ? (
                                      <ChecklistDamageFields
                                        itemId={item.id}
                                        itemName={item.name}
                                        storeCode={storeCode}
                                        notes={itemData?.notes}
                                        ahoTicketNumber={
                                          itemData?.ahoTicketNumber
                                        }
                                        lockedAhoTickets={getLockedAhoTickets(
                                          item.id,
                                          ahoTicketHolders,
                                        )}
                                        onNotesChange={onNotesChange}
                                        onAhoTicketNumberChange={
                                          onAhoTicketNumberChange
                                        }
                                      />
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {filteredCategories.length === 0 ? (
          <Card size="sm" className="border-dashed bg-card/70">
            <CardContent>
              <div className="flex flex-col gap-1 text-center">
                <p className="text-sm font-semibold">
                  Checklist tidak ditemukan
                </p>
                <p className="text-xs text-muted-foreground">
                  Coba cari dengan nama kategori atau item lain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
