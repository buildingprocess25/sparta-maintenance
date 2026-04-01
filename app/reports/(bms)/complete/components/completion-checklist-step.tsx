"use client";

import { useState } from "react";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    ChevronDown,
    Loader2,
    Store,
    Trash2,
    ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { checklistCategories } from "@/lib/checklist-data";
import { LocalNotesTextarea } from "../../create/components/local-notes-textarea";
import {
    CompletionItemCard,
    type CompletionItemState,
} from "./completion-item-card";
import type { ReportForCompletion } from "../queries";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { realisasiGrandTotal } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isItemComplete(state: CompletionItemState): boolean {
    return (
        state.afterPhotos.length > 0 &&
        state.realisasiEntries.length > 0 &&
        state.realisasiEntries.every(
            (e) => e.materialName.trim().length > 0 && e.price > 0,
        )
    );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    report: NonNullable<ReportForCompletion>;
    itemStates: Map<string, CompletionItemState>;
    onItemChange: (itemId: string, patch: Partial<CompletionItemState>) => void;
    onOpenCamera: (itemId: string, type: "after") => void;
    globalNotes: string;
    onGlobalNotesChange: (value: string) => void;
    additionalDocumentationPhotos: Array<{ id: string; previewUrl: string }>;
    onAdditionalDocumentationPhotosChange: (
        photos: Array<{ id: string; previewUrl: string }>,
    ) => void;
    additionalDocumentationNote: string;
    onAdditionalDocumentationNoteChange: (value: string) => void;
    onOpenAdditionalCamera: () => void;
    isPending: boolean;
    onBack: () => void;
    onSubmit: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CompletionChecklistStep({
    report,
    itemStates,
    onItemChange,
    onOpenCamera,
    globalNotes,
    onGlobalNotesChange,
    additionalDocumentationPhotos,
    onAdditionalDocumentationPhotosChange,
    additionalDocumentationNote,
    onAdditionalDocumentationNoteChange,
    onOpenAdditionalCamera,
    isPending,
    onBack,
    onSubmit,
}: Props) {
    // Map itemId → ReportItemJson for quick lookup
    const itemMap = new Map<string, ReportItemJson>(
        report.items.map((i) => [i.itemId, i]),
    );
    const estimationMap = new Map<string, MaterialEstimationJson[]>();
    for (const e of report.estimations) {
        if (!estimationMap.has(e.itemId)) estimationMap.set(e.itemId, []);
        estimationMap.get(e.itemId)!.push(e);
    }

    // Damaged BMS items set for fast lookup
    const damagedBMSItemIds = new Set<string>(
        report.items
            .filter(
                (item) =>
                    (item.condition === "RUSAK" ||
                        item.preventiveCondition === "NOT_OK") &&
                    item.handler === "BMS",
            )
            .map((i) => i.itemId),
    );

    const totalDamaged = damagedBMSItemIds.size;
    const totalCompleted = [...damagedBMSItemIds].filter((id) => {
        const s = itemStates.get(id);
        return s ? isItemComplete(s) : false;
    }).length;

    const [openCategories, setOpenCategories] = useState<Set<string>>(
        new Set(),
    );
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const closePreview = useHistoryBackClose(!!previewUrl, () =>
        setPreviewUrl(null),
    );

    const toggle = (id: string) =>
        setOpenCategories((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full gap-4 md:gap-8">
            {/* Checklist */}
            <div className="w-full">
                <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-1 md:px-6 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                {report.storeName}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {report.reportNumber} · {report.branchName}
                            </CardDescription>
                        </div>

                        {totalDamaged > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                                {totalCompleted === totalDamaged ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                )}
                                <span
                                    className={
                                        totalCompleted === totalDamaged
                                            ? "text-green-700 font-medium"
                                            : "text-muted-foreground"
                                    }
                                >
                                    {totalCompleted}/{totalDamaged} item selesai
                                </span>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-3 px-1 md:px-6 pb-0 md:pb-6">
                        {totalDamaged === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                Tidak ada item rusak yang dikerjakan BMS pada
                                laporan ini.
                            </p>
                        ) : (
                            checklistCategories.map((category) => {
                                // Filter category items to only damaged BMS items
                                const categoryDamagedItems =
                                    category.items.filter((catItem) =>
                                        damagedBMSItemIds.has(catItem.id),
                                    );
                                if (categoryDamagedItems.length === 0)
                                    return null;

                                const completedInCategory =
                                    categoryDamagedItems.filter((i) => {
                                        const s = itemStates.get(i.id);
                                        return s ? isItemComplete(s) : false;
                                    }).length;
                                const isAllDone =
                                    completedInCategory ===
                                    categoryDamagedItems.length;
                                const isOpen = openCategories.has(category.id);

                                return (
                                    <Collapsible
                                        key={category.id}
                                        open={isOpen}
                                        onOpenChange={() => toggle(category.id)}
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isAllDone ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                    )}
                                                    <span className="font-medium">
                                                        {category.title}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({completedInCategory}/
                                                        {
                                                            categoryDamagedItems.length
                                                        }
                                                        )
                                                    </span>
                                                </div>
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                                />
                                            </Button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent className="pt-2">
                                            <div className="space-y-4 md:p-4 md:border md:rounded-lg bg-transparent md:bg-muted/30">
                                                {categoryDamagedItems.map(
                                                    (catItem) => {
                                                        const reportItem =
                                                            itemMap.get(
                                                                catItem.id,
                                                            );
                                                        if (!reportItem)
                                                            return null;
                                                        const itemState =
                                                            itemStates.get(
                                                                catItem.id,
                                                            );
                                                        if (!itemState)
                                                            return null;
                                                        return (
                                                            <CompletionItemCard
                                                                key={catItem.id}
                                                                item={
                                                                    reportItem
                                                                }
                                                                estimations={
                                                                    estimationMap.get(
                                                                        catItem.id,
                                                                    ) ?? []
                                                                }
                                                                state={
                                                                    itemState
                                                                }
                                                                onChange={(
                                                                    patch,
                                                                ) =>
                                                                    onItemChange(
                                                                        catItem.id,
                                                                        patch,
                                                                    )
                                                                }
                                                                onOpenCamera={
                                                                    onOpenCamera
                                                                }
                                                                onPreview={
                                                                    setPreviewUrl
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })
                        )}

                        {/* Grand Total Realisasi */}
                        {totalDamaged > 0 &&
                            (() => {
                                const grandTotal = [
                                    ...damagedBMSItemIds,
                                ].reduce((sum, id) => {
                                    const s = itemStates.get(id);
                                    return (
                                        sum +
                                        (s
                                            ? realisasiGrandTotal(
                                                  s.realisasiEntries,
                                              )
                                            : 0)
                                    );
                                }, 0);
                                if (grandTotal === 0) return null;
                                return (
                                    <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3 mt-1">
                                        <span className="text-sm font-semibold">
                                            Total Realisasi Keseluruhan
                                        </span>
                                        <span className="text-sm font-bold text-primary">
                                            Rp{" "}
                                            {grandTotal.toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                );
                            })()}
                    </CardContent>
                </Card>
            </div>

            {/* ─── Global Notes ──────────────────────────────────────────────── */}
            <Card className="shadow-sm border-border/60">
                <CardHeader>
                    <CardTitle className="text-base">
                        Dokumentasi Tambahan (opsional)
                    </CardTitle>
                    <CardDescription>
                        Tambahkan foto dokumentasi tambahan dan satu catatan
                        untuk kumpulan foto ini.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onOpenAdditionalCamera}
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Tambah Foto Dokumentasi
                        </Button>
                        {additionalDocumentationPhotos.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {additionalDocumentationPhotos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="relative group"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.previewUrl}
                                            alt="Dokumentasi tambahan"
                                            className="h-20 w-20 object-cover rounded-lg border cursor-zoom-in"
                                            onClick={() =>
                                                setPreviewUrl(photo.previewUrl)
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onAdditionalDocumentationPhotosChange(
                                                    additionalDocumentationPhotos.filter(
                                                        (p) =>
                                                            p.id !== photo.id,
                                                    ),
                                                )
                                            }
                                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full h-6 w-6 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow z-10"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <LocalNotesTextarea
                            initialValue={additionalDocumentationNote}
                            onCommit={onAdditionalDocumentationNoteChange}
                        />
                    </div>
                </CardContent>
            </Card>

            <LocalNotesTextarea
                initialValue={globalNotes}
                onCommit={onGlobalNotesChange}
            />

            {/* ─── Action Buttons ────────────────────────────────────────────── */}
            <div className="md:col-span-8 md:col-start-5 md:order-3 mt-4 md:mt-0">
                <ButtonGroup className="w-full md:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        disabled={isPending}
                        className="flex-1"
                    >
                        Pilih Laporan Lain
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isPending}
                        className="flex-1"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : report.status === "REVIEW_REJECTED_REVISION" ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Submit Ulang
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Submit Laporan
                            </>
                        )}
                    </Button>
                </ButtonGroup>
            </div>

            {/* ─── Photo Preview Modal ───────────────────────────────────── */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview Foto"
                            className="w-full h-full object-contain rounded-lg max-h-[85vh]"
                        />
                        <button
                            onClick={closePreview}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
