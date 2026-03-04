"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DraftDialog } from "./draft-dialog";
import { submitReport, resubmitReport } from "@/app/reports/actions";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Zap } from "lucide-react";

import type { CreateReportFormProps } from "./components/types";
export type { StoreOption, SerializedDraft } from "./components/types";
import { StoreSelectDialog } from "./components/store-select-dialog";
import { ProgressBar } from "./components/progress-bar";
import { ChecklistStep } from "./components/checklist-step";
import { BmsEstimationStep } from "./components/bms-estimation-step";

import { useChecklist } from "./hooks/use-checklist";
import { usePhotoUpload } from "./hooks/use-photo-upload";
import { useBmsEstimation } from "./hooks/use-bms-estimation";
import { useDraft } from "./hooks/use-draft";
import { autoFillStep1, autoFillStep2 } from "./dev-utils";

export default function CreateReportForm({
    stores,
    userBranchName,
    existingDraft,
    userInfo,
    editMode,
    autoRestoreOnMount,
}: CreateReportFormProps) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!editMode;
    const shouldAutoRestore = isEditMode || !!autoRestoreOnMount;

    const {
        checklist,
        setChecklist,
        openCategories,
        setOpenCategories,
        selectedStoreCode,
        store,
        isCategoryICoolingDown,
        categoryIAvailableDate,
        activeCategories,
        handleStoreChange,
        toggleCategory,
        updateChecklistItem,
        validateStep1,
    } = useChecklist(stores, isEditMode);

    const {
        bmsItems,
        setBmsItems,
        grandTotalBms,
        buildBmsMapFromChecklist,
        addBmsEntry,
        updateBmsEntry,
        removeBmsEntry,
        validateStep2,
    } = useBmsEstimation();

    const {
        draftReportId,
        setDraftReportId,
        showDraftDialog,
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
    const rekananItems = rusakItems.filter((i) => i.handler === "Rekanan");

    const handleNextStep = () => {
        if (!validateStep1()) return;
        buildBmsMapFromChecklist(checklist, bmsItems);
        setStep(2);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        setIsSubmitting(true);
        setIsSubmitDialogOpen(false);

        try {
            const draftData = buildDraftData();

            // --- Edit mode: resubmit existing REJECTED report ---
            if (isEditMode && editMode) {
                const updatedChecklistItems = draftData.checklistItems.map(
                    (item) => ({
                        ...item,
                        photoUrl:
                            checklist.get(item.itemId)?.photoUrl ??
                            item.photoUrl,
                    }),
                );

                const result = await resubmitReport(editMode.reportNumber, {
                    ...draftData,
                    checklistItems: updatedChecklistItems,
                });

                if (result.error) {
                    toast.error(result.error, {
                        description: result.detail,
                    });
                    setIsSubmitting(false);
                    return;
                }

                toast.success("Laporan berhasil diajukan ulang!");
                router.push(`/reports/${editMode.reportNumber}`);
                return;
            }

            // --- Create mode: save draft then submit ---
            const { saveDraft } = await import("@/app/reports/actions");
            const saveResult = await saveDraft(draftData);
            if (saveResult.error) throw new Error(saveResult.error);
            const reportNumber = saveResult.reportId;
            if (!reportNumber) throw new Error("Gagal memperoleh ID Laporan");

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
                toast.error(result.error, {
                    description: result.detail,
                });
                setIsSubmitting(false);
                return;
            }

            toast.success("Laporan berhasil dibuat!");
            router.push("/reports");
        } catch (err) {
            const error = err as Error;
            setIsSubmitting(false);
            toast.error(
                isEditMode
                    ? "Gagal mengajukan ulang laporan"
                    : "Gagal membuat laporan",
                {
                    description: error.message,
                },
            );
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <DraftDialog
                open={showDraftDialog}
                draftStoreName={existingDraft?.storeName}
                draftUpdatedAt={existingDraft?.updatedAt || ""}
                isLoading={isRestoringDraft}
                isDeleting={isDeletingDraft}
                onContinueDraft={handleContinueDraft}
                onCreateNew={handleCreateNew}
            />

            {!isEditMode && (
                <StoreSelectDialog
                    open={!selectedStoreCode && !showDraftDialog}
                    stores={stores}
                    selectedStoreCode={selectedStoreCode}
                    onStoreChange={handleStoreChange}
                    onCancel={() => router.push("/dashboard")}
                />
            )}

            <LoadingOverlay
                isOpen={isSubmitting}
                message={
                    isEditMode ? "Mengajukan laporan..." : "Membuat laporan..."
                }
            />

            <Header
                variant="dashboard"
                title={
                    isEditMode
                        ? step === 1
                            ? "Edit Laporan"
                            : "Ringkasan Revisi"
                        : step === 1
                          ? "Checklist Perbaikan Toko"
                          : "Ringkasan Laporan"
                }
                showBackButton={step === 1}
                backHref={
                    isEditMode && editMode
                        ? `/reports/${editMode.reportNumber}`
                        : "/dashboard"
                }
                logo={false}
            />

            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handlePhotoCaptured}
                watermarkInfo={{
                    name: userInfo.name,
                    nik: userInfo.nik,
                    role: userInfo.role,
                    storeInfo: `Toko: ${store || "Belum Dipilih"}${draftReportId ? ` | ${draftReportId}` : ""}`,
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

            <main className="flex-1 container mx-auto px-4 md:px-4 py-4 md:py-8 max-w-7xl content-wrapper">
                <ProgressBar step={step} />

                {process.env.NODE_ENV === "development" && step === 1 && (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                            onClick={() =>
                                autoFillStep1(
                                    activeCategories,
                                    setOpenCategories,
                                    setChecklist,
                                    {
                                        storeCode: selectedStoreCode,
                                        branchName: userBranchName,
                                        draftReportId: draftReportId!,
                                    },
                                )
                            }
                        >
                            <Zap className="mr-2 h-4 w-4" />
                            Auto Fill (Dev Only)
                        </Button>
                    </div>
                )}
                {process.env.NODE_ENV === "development" && step === 2 && (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                            onClick={() => autoFillStep2(bmsItems, setBmsItems)}
                        >
                            <Zap className="mr-2 h-4 w-4" />
                            Auto Fill (Dev Only)
                        </Button>
                    </div>
                )}

                {step === 1 ? (
                    <ChecklistStep
                        storeCode={selectedStoreCode}
                        storeName={store}
                        activeCategories={activeCategories}
                        openCategories={openCategories}
                        checklist={checklist}
                        isCategoryICoolingDown={
                            isEditMode ? false : isCategoryICoolingDown
                        }
                        categoryIAvailableDate={
                            isEditMode ? null : categoryIAvailableDate
                        }
                        onToggleCategory={toggleCategory}
                        onConditionChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "condition",
                                value,
                            )
                        }
                        onNotesChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "notes",
                                value,
                            )
                        }
                        onHandlerChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "handler",
                                value,
                            )
                        }
                        onOpenCamera={handleOpenCamera}
                        onPreviewPhoto={handlePreviewPhoto}
                        onRemovePhoto={removePhoto}
                        onBack={() => router.back()}
                        onNext={handleNextStep}
                    />
                ) : (
                    <BmsEstimationStep
                        bmsItems={bmsItems}
                        bmsItemsList={bmsItemsList}
                        rekananItems={rekananItems}
                        grandTotalBms={grandTotalBms}
                        store={store}
                        storeCode={selectedStoreCode}
                        isSubmitDialogOpen={isSubmitDialogOpen}
                        setIsSubmitDialogOpen={setIsSubmitDialogOpen}
                        onAddBmsEntry={addBmsEntry}
                        onUpdateBmsEntry={updateBmsEntry}
                        onRemoveBmsEntry={removeBmsEntry}
                        onBack={() => setStep(1)}
                        onSubmit={handleSubmit}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}
