"use client";

import { AlertCircle, AlertTriangle, Loader2, SendHorizonal, Wrench, X } from "lucide-react";
import { toast } from "sonner";

import { BmsMobileHeader } from "@/components/bms-mobile/bms-mobile-header";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  getReportStatusBadgeClass,
  getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  genId,
  isCompletionItemComplete,
  type CompletionReport,
} from "./completion-utils";
import { AdditionalDocumentationSection } from "./components/additional-documentation-section";
import { CompletionItemSection } from "./components/completion-item-section";
import { StartWorkRevisionSection } from "./components/start-work-revision-section";
import { SummaryMetric } from "./components/summary-metric";
import { useCompletionWorkForm } from "./use-completion-work-form";

type CompletionClientProps = {
  report: CompletionReport;
  userNIK: string;
  userName: string;
};

export function CompletionClient({
  report,
  userNIK,
  userName,
}: CompletionClientProps) {
  const isHeaderVisible = useBmsMobileHeaderVisibility();
  const {
    additionalDocumentationNote,
    additionalDocumentationPhotos,
    cameraTarget,
    closePreview,
    completedCount,
    damagedItems,
    estimationMap,
    globalNotes,
    grandTotal,
    handlePhotoCaptured,
    handleRemovePhoto,
    handleStartWorkStoreChange,
    handleStartWorkStoreGalleryChange,
    handleSubmit,
    isOverBudget,
    validationErrors,
    isPending,
    isRestoringDraft,
    isZeroCost,
    itemStates,
    previewUrl,
    reportNumber,
    setAdditionalDocumentationNote,
    setAdditionalDocumentationPhotos,
    setCameraTarget,
    setGlobalNotes,
    setPreviewUrl,
    setStartWorkMaterialStores,
    setStartWorkMaterialStorePhotos,
    setStartWorkReceiptPhotos,
    setStartWorkSelfiePhotos,
    setStartWorkSkipPhotos,
    setUnexpectedCostNotes,
    shouldReviseStartWork,
    startWorkMaterialStorePhotos,
    startWorkMaterialStores,
    startWorkReceiptPhotos,
    startWorkSelfiePhotos,
    startWorkSkipPhotos,
    startWorkStoreGalleryInputRef,
    totalEstimation,
    unexpectedCostNotes,
    updateItemState,
  } = useCompletionWorkForm(report);

  const onSubmitClick = () => {
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      toast.error("Masih ada data yang belum lengkap", {
        description: firstError.message,
      });

      if (firstError.id.startsWith("completion-item-")) {
        const itemId = firstError.id.replace("completion-item-", "");
        window.dispatchEvent(
          new CustomEvent("open-completion-item", { detail: itemId }),
        );
      } else if (firstError.id === "start-work") {
        window.dispatchEvent(new CustomEvent("open-start-work"));
      }

      setTimeout(() => {
        document.getElementById(firstError.id)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      return;
    }
    handleSubmit();
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <BmsMobileHeader
        title="Kirim Penyelesaian"
        showBackButton
        backHref={`/reports/${reportNumber}`}
      />

      <div
        className={cn(
          "fixed inset-x-0 top-[57px] z-30 border-b border-border/40 bg-background transition-transform duration-300 ease-out",
          isHeaderVisible ? "translate-y-0" : "-translate-y-[57px]",
        )}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{report.storeName}</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {report.reportNumber} · {completedCount}/{damagedItems.length}{" "}
              item
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
              getReportStatusBadgeClass(report.status),
            )}
          >
            {getReportStatusLabel(report.status)}
          </span>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pb-32 pt-[116px]">
        <section className="border-b border-border/40 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryMetric
              label="Estimasi"
              value={formatCurrency(totalEstimation)}
            />
            <SummaryMetric
              label="Realisasi"
              value={formatCurrency(grandTotal)}
            />
            <SummaryMetric
              label="Progress"
              value={`${completedCount}/${damagedItems.length}`}
            />
          </div>
        </section>

        {/* ── Warning: Realisasi Melebihi Estimasi ─────────────────────── */}
        {isOverBudget && (
          <section
            id="unexpected-cost-notes"
            className="mt-4 rounded-xl border border-amber-400/60 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  ⚠️ Realisasi biaya melebihi estimasi awal!
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                  Total realisasi ({formatCurrency(grandTotal)}) melampaui estimasi ({formatCurrency(totalEstimation)}).
                  Anda tetap dapat mengirim laporan, namun <strong>wajib mengisi catatan biaya tak terduga</strong> di bawah ini.
                </p>
                <textarea
                  id="unexpected-cost-notes-input"
                  className="mt-3 w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-600 dark:bg-amber-950/50"
                  rows={3}
                  placeholder="Jelaskan penyebab kenaikan biaya, misal: penggantian komponen tambahan, material langka, dll."
                  value={unexpectedCostNotes}
                  onChange={(e) => setUnexpectedCostNotes(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {shouldReviseStartWork && (
          <StartWorkRevisionSection
            isZeroCost={isZeroCost}
            skipPhotos={startWorkSkipPhotos}
            onSkipPhotosChange={setStartWorkSkipPhotos}
            selfiePhotos={startWorkSelfiePhotos}
            materialStorePhotos={startWorkMaterialStorePhotos}
            receiptPhotos={startWorkReceiptPhotos}
            materialStores={startWorkMaterialStores}
            onOpenCamera={(target) => setCameraTarget({ target })}
            onOpenStoreGallery={() =>
              startWorkStoreGalleryInputRef.current?.click()
            }
            onRemoveSelfie={(id) =>
              handleRemovePhoto(id, () =>
                setStartWorkSelfiePhotos((prev) =>
                  prev.filter((photo) => photo.id !== id),
                ),
              )
            }
            onRemoveStorePhoto={(id) =>
              handleRemovePhoto(id, () =>
                setStartWorkMaterialStorePhotos((prev) =>
                  prev.filter((photo) => photo.id !== id),
                ),
              )
            }
            onRemoveReceipt={(id) =>
              handleRemovePhoto(id, () =>
                setStartWorkReceiptPhotos((prev) =>
                  prev.filter((photo) => photo.id !== id),
                ),
              )
            }
            onAddStore={() =>
              setStartWorkMaterialStores((prev) => [
                ...prev,
                { id: genId(), name: "", city: "" },
              ])
            }
            onRemoveStore={(id) =>
              setStartWorkMaterialStores((prev) =>
                prev.filter((store) => store.id !== id),
              )
            }
            onStoreChange={handleStartWorkStoreChange}
            onPreview={setPreviewUrl}
          />
        )}

        <input
          ref={startWorkStoreGalleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleStartWorkStoreGalleryChange}
        />

        <div className="mb-2 mt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Form Hasil Pekerjaan BMS
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Isi foto sesudah dan realisasi biaya untuk item rusak atau Not OK
            yang ditangani BMS.
          </p>
        </div>

        {damagedItems.length === 0 ? (
          <section className="border-b border-border/40 py-5">
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
              Tidak ada item rusak yang dikerjakan BMS pada laporan ini.
            </div>
          </section>
        ) : (
          damagedItems.map((item) => {
            const state = itemStates.get(item.itemId);
            if (!state) return null;

            return (
              <CompletionItemSection
                key={item.itemId}
                item={item}
                estimations={estimationMap.get(item.itemId) ?? []}
                state={state}
                isComplete={isCompletionItemComplete(state)}
                onOpenCamera={() =>
                  setCameraTarget({
                    target: "item",
                    itemId: item.itemId,
                  })
                }
                onChange={(patch) => updateItemState(item.itemId, patch)}
                onRemoveAfterPhoto={(id) =>
                  handleRemovePhoto(id, () =>
                    updateItemState(item.itemId, {
                      afterPhotos: state.afterPhotos.filter(
                        (photo) => photo.id !== id,
                      ),
                    }),
                  )
                }
                onPreview={setPreviewUrl}
              />
            );
          })
        )}

        <AdditionalDocumentationSection
          photos={additionalDocumentationPhotos}
          note={additionalDocumentationNote}
          onOpenCamera={() => setCameraTarget({ target: "additional" })}
          onRemovePhoto={(id) =>
            handleRemovePhoto(id, () =>
              setAdditionalDocumentationPhotos((prev) =>
                prev.filter((photo) => photo.id !== id),
              ),
            )
          }
          onNoteChange={setAdditionalDocumentationNote}
          onPreview={setPreviewUrl}
        />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            size="lg"
            disabled={isPending || isRestoringDraft}
            onClick={onSubmitClick}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Mengirim
              </>
            ) : (
              <>
                Kirim Hasil Pekerjaan
                <SendHorizonal data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>
      </footer>

      <CameraModal
        isOpen={cameraTarget !== null}
        onCapture={handlePhotoCaptured}
        onClose={() => setCameraTarget(null)}
        watermarkInfo={{
          name: userName,
          nik: userNIK,
          role: "BMS",
          storeInfo: `Toko: ${report.storeName}`,
        }}
      />

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview foto"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={closePreview}
              className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full bg-white text-black"
              aria-label="Tutup preview"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <LoadingOverlay
        isOpen={isRestoringDraft}
        message="Memuat draft penyelesaian..."
      />
    </div>
  );
}
