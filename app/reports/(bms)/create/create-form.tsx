"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DraftDialog } from "./draft-dialog";
import { submitReport, resubmitReport } from "@/app/reports/actions";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { ArrowLeft, Zap } from "lucide-react";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { cn } from "@/lib/utils";

import type { CreateReportFormProps } from "./components/types";
export type { StoreOption, SerializedDraft } from "./components/types";
import { StoreSelectDialog } from "./components/store-select-dialog";
import { ChecklistStep } from "./components/checklist-step";
import { BmsEstimationStep } from "./components/bms-estimation-step";

import { useChecklist } from "./hooks/use-checklist";
import { usePhotoUpload } from "./hooks/use-photo-upload";
import { useBmsEstimation } from "./hooks/use-bms-estimation";
import { useDraft } from "./hooks/use-draft";
import { clearDraftPhotos } from "./hooks/draft-photo-storage";
import { autoFillStep1, autoFillStep2 } from "./dev-utils";

const WIZARD_STEPS = [
    { label: "Checklist" },
    { label: "Estimasi" },
] as const;

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
    const isHeaderVisible = useBmsMobileHeaderVisibility();

    const isEditMode = !!editMode;
    const shouldAutoRestore = isEditMode || !!autoRestoreOnMount;
    const activeStepIndex = step - 1;
    const progressValue = (step / WIZARD_STEPS.length) * 100;
    const backHref =
        isEditMode && editMode ? `/reports/${editMode.reportNumber}` : "/dashboard";

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
                isEditMode
                    ? "Gagal mengajukan ulang laporan"
                    : "Gagal membuat laporan",
                {
                    description:
                        "Terjadi kesalahan internal. Silakan coba lagi.",
                },
            );
        }
    };

    return (
        <div className="relative min-h-svh bg-background text-foreground">
            {showDraftDialog ? (
                <DraftDialog
                    open={showDraftDialog}
                    draftStoreName={
                        localDraftData?.storeName || existingDraft?.storeName
                    }
                    draftUpdatedAt={
                        (localDraftData as { savedAt?: string } | null)
                            ?.savedAt ||
                        existingDraft?.updatedAt ||
                        undefined
                    }
                    isLoading={isRestoringDraft}
                    isDeleting={isDeletingDraft}
                    onContinueDraft={handleContinueDraft}
                    onCreateNew={handleCreateNew}
                />
            ) : !isEditMode ? (
                <StoreSelectDialog
                    open={!selectedStoreCode}
                    stores={stores}
                    selectedStoreCode={selectedStoreCode}
                    onStoreChange={handleStoreChange}
                    onCancel={() => router.push("/dashboard")}
                />
            ) : null}

            <LoadingOverlay
                isOpen={isSubmitting}
                message={
                    isEditMode ? "Mengajukan laporan..." : "Membuat laporan..."
                }
            />

            <header
                className={cn(
                    "fixed inset-x-0 top-0 z-50 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform",
                    isHeaderVisible ? "translate-y-0" : "-translate-y-full",
                )}
            >
                <div className="mx-auto grid w-full max-w-lg grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 py-3">
                    <div className="flex justify-start">
                        {step === 2 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Kembali ke checklist"
                                className="rounded-full"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft />
                            </Button>
                        ) : (
                            <Button
                                asChild
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Kembali"
                                className="rounded-full"
                            >
                                <Link href={backHref}>
                                    <ArrowLeft />
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="min-w-0 text-center">
                        <h1 className="truncate text-xs font-semibold text-muted-foreground">
                            {isEditMode ? "Edit Laporan" : "Buat Laporan"}
                        </h1>
                        <p className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
                            {step} / {WIZARD_STEPS.length}{" "}
                            {WIZARD_STEPS[activeStepIndex]?.label}
                        </p>
                    </div>

                    <div />
                </div>

                <div
                    aria-hidden="true"
                    className="h-0.5 w-full bg-border/70"
                    role="presentation"
                >
                    <div
                        className="h-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${progressValue}%` }}
                    />
                </div>
            </header>

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

            <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pt-20 pb-32">
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
                            <Zap data-icon="inline-start" />
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
                            <Zap data-icon="inline-start" />
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
        </div>
    );
}

