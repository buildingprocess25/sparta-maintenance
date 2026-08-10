"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  InfoIcon,
  Search,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { resolvePhotoUrl } from "@/lib/storage/photo-url";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { LocalAhoInput } from "./local-aho-input";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import {
  type ChecklistItem,
  type ChecklistCondition,
  type ChecklistCategory,
} from "@/lib/checklist-data";

interface ChecklistStepProps {
  storeCode?: string;
  isRepairOnlyMode: boolean; // mapped from isCategoryICoolingDown (or similar intent)
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
  onOpenCamera: (itemId: string) => void;
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
  activeCategories,
  checklist,
  onConditionChange,
  onNotesChange,
  onAhoTicketNumberChange,
  onHandlerChange,
  onOpenCamera,
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

      <Card size="sm" className="bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <InfoIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">
                {isRepairOnlyMode ? "Mode Perbaikan" : "Mode Checklist Wajib"}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isRepairOnlyMode
                  ? "Toko sudah mengisi item preventif. Anda cukup memilih item yang rusak dan mengisi detail perbaikannya."
                  : "Toko belum mengisi item preventif. Anda wajib mengevaluasi semua item checklist."}
              </p>
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
                        const condition = itemData?.condition;
                        const handler = itemData?.handler;

                        const isGood = condition === "baik";
                        const isBroken = condition === "rusak";
                        const isUnavailable = condition === "tidak_ada";
                        const needsPhotoEvidence = isGood || isBroken;

                        const hasPhoto =
                          !!itemData?.photo || !!itemData?.photoUrl;

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
                                    {item.desc ? (
                                      <p className="text-sm text-muted-foreground">
                                        {item.desc}
                                      </p>
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

                                    <div className="flex flex-col gap-2" data-tour="bms-checklist-photo">
                                      <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                                        Foto Bukti{" "}
                                        <span className="text-destructive">
                                          *
                                        </span>
                                      </p>
                                      {!hasPhoto ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="h-12 border-dashed"
                                          onClick={() => onOpenCamera(item.id)}
                                        >
                                          <Camera
                                            data-icon="inline-start"
                                            className="mr-2 h-4 w-4"
                                          />
                                          Upload Image
                                        </Button>
                                      ) : (
                                        <PhotoThumbnail
                                          photo={itemData?.photo}
                                          photoUrl={itemData?.photoUrl}
                                          onPreview={onPreviewPhoto}
                                          onRemove={() =>
                                            onRemovePhoto(item.id)
                                          }
                                        />
                                      )}
                                    </div>

                                    {isBroken ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex flex-col gap-2" data-tour="bms-checklist-notes">
                                          <Label
                                            htmlFor={`${item.id}-note`}
                                            className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
                                          >
                                            Catatan{" "}
                                            <span className="text-destructive">
                                              *
                                            </span>
                                          </Label>
                                          <LocalNotesTextarea
                                            required={true}
                                            initialValue={itemData?.notes || ""}
                                            onCommit={(val) =>
                                              onNotesChange(
                                                item.id,
                                                item.name,
                                                val,
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="flex flex-col gap-2" data-tour="bms-checklist-aho">
                                          <Label
                                            htmlFor={`${item.id}-aho`}
                                            className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
                                          >
                                            No Tiket AHO{" "}
                                            <span className="text-destructive">
                                              *
                                            </span>
                                          </Label>
                                          <LocalAhoInput
                                            id={`${item.id}-aho`}
                                            storeCode={storeCode}
                                            required
                                            initialValue={itemData?.ahoTicketNumber || ""}
                                            onCommit={(val) =>
                                              onAhoTicketNumberChange(
                                                item.id,
                                                item.name,
                                                val,
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
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

/* ─── Photo Thumbnail (internal) ─── */
function PhotoThumbnail({
  photo,
  photoUrl,
  onPreview,
  onRemove,
}: {
  photo?: File;
  photoUrl?: string;
  onPreview: (photo: File | string) => void;
  onRemove: () => void;
}) {
  const displayPhotoUrl = photoUrl ? resolvePhotoUrl(photoUrl) : undefined;
  const localPhotoUrl = useMemo(
    () => (!displayPhotoUrl && photo ? URL.createObjectURL(photo) : ""),
    [displayPhotoUrl, photo],
  );
  const previewSrc = displayPhotoUrl || localPhotoUrl;

  if (!previewSrc) return null;

  return (
    <div className="space-y-2">
      <div
        className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-primary/20 bg-muted"
        onClick={() => onPreview(displayPhotoUrl ?? photo ?? previewSrc)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt="Preview"
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          <CheckCircle2 className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {photo?.name ?? "Foto tersimpan"}
            </p>
          </div>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
