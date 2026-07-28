"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { DraftDialog } from "./draft-dialog";
import { submitReport, resubmitReport } from "@/app/reports/actions";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

import type { CreateReportFormProps } from "./components/types";
export type { StoreOption, SerializedDraft } from "./components/types";
import { StoreStep } from "./components/store-step";
import { ChecklistStep } from "./components/checklist-step";
import { BmsEstimationStep } from "./components/bms-estimation-step";
import { ReviewStep } from "./components/review-step";
import {
  ReportWizardShell,
  type ReportWizardStep,
} from "./components/report-wizard-shell";
import { BmsReportTour } from "./components/bms-report-tour";

import { useChecklist } from "./hooks/use-checklist";
import { usePhotoUpload } from "./hooks/use-photo-upload";
import { useBmsEstimation } from "./hooks/use-bms-estimation";
import { useDraft } from "./hooks/use-draft";
import { clearDraftPhotos } from "./hooks/draft-photo-storage";

const WIZARD_STEPS: ReportWizardStep[] = [
  { key: "store", label: "Pilih Toko" },
  { key: "checklist", label: "Checklist" },
  { key: "estimation", label: "Estimasi" },
  { key: "review", label: "Review" },
];

export default function CreateReportForm({
  stores,
  userBranchName,
  existingDraft,
  userInfo,
  editMode,
  autoRestoreOnMount,
}: CreateReportFormProps) {
  const router = useRouter();
  // Default step for create is "store", but for edit it might be "checklist" directly if we already have a store.
  // However, the v2 flow might just have edit skip store step logic by checking selectedStoreCode.
  const [step, setStep] = useState<
    "store" | "checklist" | "estimation" | "review"
  >(editMode ? "checklist" : "store");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editMode;
  const shouldAutoRestore = isEditMode || !!autoRestoreOnMount;

  const {
    checklist,
    setChecklist,
    setOpenCategories,
    selectedStoreCode,
    store,
    isCategoryICoolingDown,
    activeCategories,
    handleStoreChange,
    toggleCategory,
    updateChecklistItem,
    validateStep1,
    openCategories,
    devAutofill,
  } = useChecklist(stores, isEditMode);

  const {
    bmsItems,
    setBmsItems,
    grandTotalBms,
    buildBmsMapFromChecklist,
    addBmsEntryWithDetails,
    updateBmsEntryWithDetails,
    removeBmsEntry,
    validateStep2,
    devAutofillBms,
  } = useBmsEstimation();

  const {
    draftReportId,
    setDraftReportId,
    showDraftDialog,
    localDraftData,
    isRestoringDraft,
    isDeletingDraft,
    handleContinueDraft,
    handleCreateNew,
    buildDraftData,
  } = useDraft({
    existingDraft,
    stores,
    checklist,
    setChecklist,
    setOpenCategories,
    bmsItems,
    setBmsItems,
    selectedStoreCode,
    store,
    userBranchName,
    activeCategories,
    grandTotalBms,
    isSubmitting,
    handleStoreChange,
    autoRestore: shouldAutoRestore,
    disableAutoSave: isEditMode,
  });

  const {
    isCameraOpen,
    setIsCameraOpen,
    previewPhoto,
    handleOpenCamera,
    handlePhotoCaptured,
    removePhoto,
    handlePreviewPhoto,
    closePreview,
  } = usePhotoUpload({
    checklist,
    setChecklist,
    selectedStoreCode,
    store,
    userBranchName,
    draftReportId,
    setDraftReportId,
  });

  const rusakItems = Array.from(checklist.values()).filter(
    (i) => i.condition === "rusak",
  );
  const bmsItemsList = rusakItems.filter((i) => i.handler === "BMS");

  // Handlers
  const handleNext = () => {
    if (step === "store") {
      if (!selectedStoreCode) {
        toast.error("Silakan pilih toko terlebih dahulu");
        return;
      }
      setStep("checklist");
    } else if (step === "checklist") {
      if (!validateStep1()) return;
      buildBmsMapFromChecklist(checklist, bmsItems);
      setStep("estimation");
    } else if (step === "estimation") {
      if (!validateStep2()) return;
      setStep("review");
    }
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (step === "store") {
      router.push("/dashboard");
    } else if (step === "checklist") {
      if (isEditMode) {
        router.push(`/reports/${editMode.reportNumber}`);
      } else {
        setStep("store");
      }
    } else if (step === "estimation") {
      setStep("checklist");
    } else if (step === "review") {
      setStep("estimation");
    }
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);

    try {
      const draftData = buildDraftData();

      // --- Edit mode: resubmit existing REJECTED report ---
      if (isEditMode && editMode) {
        const updatedChecklistItems = draftData.checklistItems.map((item) => ({
          ...item,
          photoUrl: checklist.get(item.itemId)?.photoUrl ?? item.photoUrl,
        }));

        const result = await resubmitReport(editMode.reportNumber, {
          ...draftData,
          checklistItems: updatedChecklistItems,
        });

        if (result.error) {
          toast.error(result.error);
          setIsSubmitting(false);
          return;
        }

        toast.success("Laporan berhasil diajukan ulang!");
        router.push(`/reports/${editMode.reportNumber}`);
        return;
      }

      // --- Create mode: direct submit ---
      const updatedChecklistItems = [...draftData.checklistItems];
      for (const item of updatedChecklistItems) {
        const checkedItem = checklist.get(item.itemId);
        if (checkedItem?.photoUrl) {
          item.photoUrl = checkedItem.photoUrl;
        }
      }

      const result = await submitReport({
        ...draftData,
        checklistItems: updatedChecklistItems,
      });

      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // Remove draft from local storage after successful submit
      localStorage.removeItem("sparta_bms_draft");
      await clearDraftPhotos().catch((error) => {
        console.warn("Gagal membersihkan foto draft", error);
      });

      toast.success("Laporan berhasil dibuat!");
      router.push("/reports");
    } catch {
      setIsSubmitting(false);
      toast.error(
        isEditMode ? "Gagal mengajukan ulang laporan" : "Gagal membuat laporan",
        {
          description: "Terjadi kesalahan internal. Silakan coba lagi.",
        },
      );
    }
  };

  const isRepairOnlyMode = isCategoryICoolingDown;

  // Store data to pass to review step
  const storeObj = stores.find((s) => s.code === selectedStoreCode);

  return (
    <>
      {!showDraftDialog && (
        <BmsReportTour
          key={`${isEditMode ? "revision" : "create"}:${step}:${isRepairOnlyMode}`}
          activeStep={step}
          isEditMode={isEditMode}
          isRepairOnlyMode={isRepairOnlyMode}
        />
      )}

      {showDraftDialog && (
        <DraftDialog
          open={showDraftDialog}
          draftStoreName={localDraftData?.storeName || existingDraft?.storeName}
          draftUpdatedAt={
            (localDraftData as { savedAt?: string } | null)?.savedAt ||
            existingDraft?.updatedAt ||
            undefined
          }
          isLoading={isRestoringDraft}
          isDeleting={isDeletingDraft}
          onContinueDraft={handleContinueDraft}
          onCreateNew={handleCreateNew}
        />
      )}

      <LoadingOverlay
        isOpen={isSubmitting}
        message={isEditMode ? "Mengajukan laporan..." : "Membuat laporan..."}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCaptured}
        watermarkInfo={{
          name: userInfo.name,
          nik: userInfo.nik,
          role: userInfo.role,
          storeInfo: `Toko: ${store || "Belum Dipilih"}`,
        }}
      />

      {previewPhoto && (
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
              src={previewPhoto}
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

      <ReportWizardShell
        title={isEditMode ? "Edit Laporan" : "Buat Laporan"}
        steps={WIZARD_STEPS}
        activeStep={step}
        onBack={handleBack}
        footer={
          <Button
            type="button"
            size="lg"
            className="w-full text-base shadow-sm"
            onClick={step === "review" ? handleSubmit : handleNext}
            disabled={isSubmitting || (step === "store" && !selectedStoreCode)}
            data-tour={step === "review" ? "bms-report-submit" : undefined}
          >
            {step === "review" ? (
              isEditMode ? (
                "Simpan Perubahan"
              ) : (
                <>
                  Submit Laporan <Send className="ml-2 h-4 w-4" />
                </>
              )
            ) : (
              "Lanjutkan"
            )}
          </Button>
        }
      >
        {step === "store" && (
          <StoreStep
            stores={stores}
            selectedStoreCode={selectedStoreCode}
            onStoreSelect={(code) => {
              handleStoreChange(code);
            }}
          />
        )}

        {step === "checklist" && (
          <ChecklistStep
            isRepairOnlyMode={isRepairOnlyMode}
            activeCategories={activeCategories}
            checklist={checklist}
            onConditionChange={(itemId, itemName, value) =>
              updateChecklistItem(itemId, itemName, "condition", value)
            }
            onNotesChange={(itemId, itemName, value) =>
              updateChecklistItem(itemId, itemName, "notes", value)
            }
            onAhoTicketNumberChange={(itemId, itemName, value) =>
              updateChecklistItem(itemId, itemName, "ahoTicketNumber", value)
            }
            onHandlerChange={(itemId, itemName, value) =>
              updateChecklistItem(itemId, itemName, "handler", value)
            }
            onOpenCamera={handleOpenCamera}
            onPreviewPhoto={handlePreviewPhoto}
            onRemovePhoto={removePhoto}
            openCategories={openCategories}
            onToggleCategory={toggleCategory}
            onDevAutofill={devAutofill}
          />
        )}

        {step === "estimation" && (
          <BmsEstimationStep
            bmsItems={bmsItems}
            bmsItemsList={bmsItemsList}
            grandTotalBms={grandTotalBms}
            onAddBmsEntryWithDetails={addBmsEntryWithDetails}
            onUpdateBmsEntryWithDetails={updateBmsEntryWithDetails}
            onRemoveBmsEntry={removeBmsEntry}
            onDevAutofill={() => devAutofillBms(bmsItemsList)}
          />
        )}

        {step === "review" && (
          <ReviewStep
            store={storeObj}
            isRepairOnlyMode={isRepairOnlyMode}
            checklist={checklist}
            bmsItems={bmsItems}
            grandTotalBms={grandTotalBms}
          />
        )}
      </ReportWizardShell>
    </>
  );
}
