"use client";

import { AlertCircle, Loader2, SendHorizonal, X } from "lucide-react";
import { toast } from "sonner";

import { BmsMobileHeader } from "@/components/bms-mobile/bms-mobile-header";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Textarea } from "@/components/ui/textarea";
import { BmsBalanceCard } from "@/components/bms-balance-card";
import {
  getReportStatusBadgeClass,
  getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  isCompletionItemComplete,
  type CompletionReport,
} from "./completion-utils";
import { AdditionalDocumentationSection } from "./components/additional-documentation-section";
import { CompletionItemSection } from "./components/completion-item-section";
import { StartWorkRevisionSection } from "./components/start-work-revision-section";
import { SummaryMetric } from "./components/summary-metric";
import { useCompletionWorkForm } from "./use-completion-work-form";
import {
  UNEXPECTED_COST_NOTES_MAX_LENGTH,
  UNEXPECTED_COST_REASON_DESCRIPTION,
  UNEXPECTED_COST_REASON_PLACEHOLDER,
  UNEXPECTED_COST_REASON_TITLE,
} from "@/lib/unexpected-cost";

import type { BmsBalanceInfo } from "@/lib/balance";

type CompletionClientProps = {
  report: CompletionReport;
  userNIK: string;
  userName: string;
  bmsBalanceInfo: BmsBalanceInfo;
};

export function CompletionClient({
  report,
  userNIK,
  userName,
  bmsBalanceInfo,
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
    grandTotal,
    handlePhotoCaptured,
    handleRemovePhoto,
    handleStartWorkStoreChange,
    handleAddStartWorkMaterialStorePhoto,
    handleRemoveStartWorkStorePhoto,
    handleAddStartWorkStore,
    handleRemoveStartWorkStore,
    handleSubmit,
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
    setPreviewUrl,
    setStartWorkReceiptPhotos,
    setStartWorkSelfiePhotos,
    setStartWorkSkipPhotos,
    shouldReviseStartWork,
    startWorkMaterialStores,
    startWorkReceiptPhotos,
    startWorkSelfiePhotos,
    startWorkSkipPhotos,
    totalEstimation,
    updateItemState,
    isOverBudget,
    unexpectedCostNotes,
    setUnexpectedCostNotes,
  } = useCompletionWorkForm(
    report,
    bmsBalanceInfo.availableBalance + report.totalEstimation,
  );

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

        <BmsBalanceCard balance={bmsBalanceInfo} className="mt-4" />

        {shouldReviseStartWork && (
          <StartWorkRevisionSection
            isZeroCost={isZeroCost}
            skipPhotos={startWorkSkipPhotos}
            onSkipPhotosChange={setStartWorkSkipPhotos}
            selfiePhotos={startWorkSelfiePhotos}
            receiptPhotos={startWorkReceiptPhotos}
            materialStores={startWorkMaterialStores}
            onOpenCamera={(target) => setCameraTarget({ target })}
            onOpenStoreCamera={(storeId) =>
              setCameraTarget({ target: "startStore", storeId })
            }
            onAddStorePhoto={(storeId, file) =>
              handleAddStartWorkMaterialStorePhoto(storeId, file)
            }
            onRemoveSelfie={(id) =>
              handleRemovePhoto(id, () =>
                setStartWorkSelfiePhotos((prev) =>
                  prev.filter((photo) => photo.id !== id),
                ),
              )
            }
            onRemoveStorePhoto={(storeId, photoId) =>
              handleRemoveStartWorkStorePhoto(storeId, photoId)
            }
            onRemoveReceipt={(id) =>
              handleRemovePhoto(id, () =>
                setStartWorkReceiptPhotos((prev) =>
                  prev.filter((photo) => photo.id !== id),
                ),
              )
            }
            onAddStore={handleAddStartWorkStore}
            onRemoveStore={handleRemoveStartWorkStore}
            onStoreChange={handleStartWorkStoreChange}
            onPreview={setPreviewUrl}
          />
        )}

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

        {isOverBudget && (
          <section
            id="unexpected-cost-notes"
            className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {UNEXPECTED_COST_REASON_TITLE}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {UNEXPECTED_COST_REASON_DESCRIPTION}
                </p>
              </div>
            </div>
            <label
              htmlFor="unexpected-cost-notes-input"
              className="text-xs font-medium text-foreground mb-1.5 block"
            >
              Alasan <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="unexpected-cost-notes-input"
              className="min-h-[96px] resize-none"
              maxLength={UNEXPECTED_COST_NOTES_MAX_LENGTH}
              placeholder={UNEXPECTED_COST_REASON_PLACEHOLDER}
              value={unexpectedCostNotes}
              onChange={(e) =>
                setUnexpectedCostNotes(
                  e.target.value.slice(0, UNEXPECTED_COST_NOTES_MAX_LENGTH),
                )
              }
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {unexpectedCostNotes.length}/{UNEXPECTED_COST_NOTES_MAX_LENGTH}
            </p>
          </section>
        )}
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
