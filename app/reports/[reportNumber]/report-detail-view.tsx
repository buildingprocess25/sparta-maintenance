"use client";

import { useState, useMemo, useTransition } from "react";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Layers, Package, ClipboardList, Printer } from "lucide-react";

import { submitCompletion } from "@/app/reports/actions/submit-completion";
import { reviewEstimation } from "@/app/reports/actions/approve-estimation";
import { reviewCompletion } from "@/app/reports/actions/review-completion";
import { approveFinal } from "@/app/reports/actions/approve-final";

import type { ReportData, Viewer, ActionState } from "./_components/types";
import { StatusTimeline } from "./_components/status-timeline";
import { ReportSidebar } from "./_components/report-sidebar";
import { ChecklistTab } from "./_components/checklist-tab";
import { EstimationsTab } from "./_components/estimations-tab";
import { CompletionTab } from "./_components/completion-tab";
import { HistoryTab } from "./_components/history-tab";
import { MobileCtaBar } from "./_components/mobile-cta-bar";

export type { ReportData };

type ReportDetailProps = {
    report: ReportData;
    viewer: Viewer;
};

export function ReportDetailView({ report, viewer }: ReportDetailProps) {
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const rusakCount = report.items.filter(
        (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
    ).length;

    // Show Penyelesaian tab instead of Estimasi for statuses after work is done
    const COMPLETION_STATUSES = [
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "APPROVED_BMC",
        "REVIEW_REJECTED_REVISION",
        "COMPLETED",
    ];
    const showCompletionTab = COMPLETION_STATUSES.includes(report.status);

    const [isPending, startTransition] = useTransition();
    const [notesInput, setNotesInput] = useState("");
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("checklist");
    const [viewedSections, setViewedSections] = useState<Set<string>>(
        new Set(),
    );
    const closeLightbox = useHistoryBackClose(!!lightboxSrc, () =>
        setLightboxSrc(null),
    );

    const isBmcReviewer =
        viewer.role === "BMC" && report.status === "PENDING_REVIEW";
    const isBnmReviewer =
        viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC";

    const requiredSections = useMemo(() => {
        if (!isBmcReviewer && !isBnmReviewer) return new Set<string>();
        const s = new Set<string>();
        if (report.startSelfieUrls.length > 0) s.add("selfie");
        if (report.startReceiptUrls.length > 0) s.add("nota");
        if (report.completionAdditionalPhotos.length > 0)
            s.add("additional-docs");
        report.items
            .filter(
                (item) =>
                    (item.condition === "RUSAK" ||
                        item.preventiveCondition === "NOT_OK") &&
                    item.handler === "BMS" &&
                    (item.afterImages?.length ?? 0) > 0,
            )
            .forEach((item) => s.add(`after-${item.itemId}`));
        return s;
    }, [isBmcReviewer, isBnmReviewer, report]);

    function handleSectionViewed(sectionId: string) {
        setViewedSections((prev) => new Set(prev).add(sectionId));
    }

    const handleSubmitCompletion = () => {
        startTransition(async () => {
            const result = await submitCompletion(
                report.reportNumber,
                notesInput || undefined,
            );
            if (result.error) {
                toast.error("Gagal mengirim laporan penyelesaian", {
                    description: result.error,
                });
            } else {
                toast.success("Laporan dikirim!", {
                    description:
                        "Status laporan diubah menjadi 'Menunggu Review Penyelesaian'.",
                });
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleReviewEstimation = (
        decision: "approve" | "reject_revision" | "reject",
    ) => {
        startTransition(async () => {
            const result = await reviewEstimation(
                report.reportNumber,
                decision,
                notesInput || undefined,
            );
            if (result.error) {
                toast.error("Gagal memproses estimasi", {
                    description: result.error,
                });
            } else {
                const labels = {
                    approve: "Estimasi disetujui",
                    reject_revision: "Estimasi ditolak (revisi)",
                    reject: "Estimasi ditolak",
                };
                toast.success(labels[decision]);
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleReviewCompletion = (
        decision: "approve" | "reject_revision",
    ) => {
        if (decision === "approve" && isBmcReviewer) {
            const unviewed = [...requiredSections].filter(
                (id) => !viewedSections.has(id),
            );
            if (unviewed.length > 0) {
                const firstId = unviewed[0];
                const sectionLabel =
                    firstId === "selfie"
                        ? "Foto Selfie"
                        : firstId === "nota"
                          ? "Foto Nota / Struk Belanja"
                          : `Foto Sesudah item ${firstId.replace("after-", "")}`;
                toast.warning("Tinjau semua foto terlebih dahulu", {
                    description: `Belum ditinjau: ${sectionLabel}. Klik foto untuk menandai sudah ditinjau.`,
                });
                setActiveTab("estimations");
                setTimeout(() => {
                    const el = document.getElementById(`review-${firstId}`);
                    if (el)
                        el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                }, 150);
                return;
            }
        }
        startTransition(async () => {
            const result = await reviewCompletion(
                report.reportNumber,
                decision,
                notesInput || undefined,
            );
            if (result.error) {
                toast.error("Gagal memproses review", {
                    description: result.error,
                });
            } else {
                toast.success(
                    decision === "approve"
                        ? "Pekerjaan disetujui (BMC)"
                        : "Pekerjaan ditolak (revisi)",
                );
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleFinalApproval = (decision: "approve" | "reject_revision") => {
        if (decision === "approve" && isBnmReviewer) {
            const unviewed = [...requiredSections].filter(
                (id) => !viewedSections.has(id),
            );
            if (unviewed.length > 0) {
                const firstId = unviewed[0];
                const sectionLabel =
                    firstId === "selfie"
                        ? "Foto Selfie"
                        : firstId === "nota"
                          ? "Foto Nota / Struk Belanja"
                          : firstId === "additional-docs"
                            ? "Dokumentasi Tambahan"
                            : `Foto Sesudah item ${firstId.replace("after-", "")}`;
                toast.warning("Tinjau semua foto terlebih dahulu", {
                    description: `Belum ditinjau: ${sectionLabel}. Klik foto untuk menandai sudah ditinjau.`,
                });
                setActiveTab("estimations");
                setTimeout(() => {
                    const el = document.getElementById(`review-${firstId}`);
                    if (el)
                        el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                }, 150);
                return;
            }
        }

        startTransition(async () => {
            const result = await approveFinal(
                report.reportNumber,
                decision,
                notesInput || undefined,
            );
            if (result.error) {
                toast.error("Gagal memproses persetujuan final", {
                    description: result.error,
                });
            } else {
                toast.success(
                    decision === "approve"
                        ? "Laporan disetujui final oleh BNM"
                        : "Laporan dikembalikan untuk revisi",
                );
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const actions: ActionState = {
        isPending,
        notesInput,
        setNotesInput,
        activeDialog,
        setActiveDialog,
        handleSubmitCompletion,
        handleReviewEstimation,
        handleReviewCompletion,
        handleFinalApproval,
    };

    const hasWorkflowAction =
        (viewer.role === "BMS" &&
            (report.status === "ESTIMATION_APPROVED" ||
                report.status === "IN_PROGRESS" ||
                report.status === "REVIEW_REJECTED_REVISION")) ||
        (viewer.role === "BMC" &&
            (report.status === "PENDING_ESTIMATION" ||
                report.status === "PENDING_REVIEW")) ||
        (viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC");

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title="Detail Laporan"
                description={`#${report.reportNumber}`}
                showBackButton
                backHref="/reports"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-8">
                {!["BMC", "BNM_MANAGER"].includes(viewer.role) && (
                    <div className="mb-10 lg:mb-16 md:-mt-5">
                        <StatusTimeline status={report.status} />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <ReportSidebar
                        report={report}
                        viewer={viewer}
                        rusakCount={rusakCount}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        actions={actions}
                    />

                    <div className="lg:col-span-8 xl:col-span-9">
                        {/* Mobile PDF button — above tabs, separate from bottom action bar */}
                        <div className="lg:hidden mb-4">
                            <a
                                href={`/api/reports/${report.reportNumber}/pdf?v=${report.updatedAt.getTime()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full"
                            >
                                <Button
                                    variant={
                                        hasWorkflowAction
                                            ? "outline"
                                            : "default"
                                    }
                                    className="w-full"
                                    size="lg"
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Lihat Laporan Lengkap (PDF)
                                </Button>
                            </a>
                        </div>
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <div className="mb-5">
                                <TabsList className="w-full bg-primary/10">
                                    <TabsTrigger
                                        value="checklist"
                                        className="rounded-lg px-2 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 sm:gap-2"
                                    >
                                        <Layers className="h-4 w-4 shrink-0" />
                                        <span className="font-medium text-xs sm:text-sm truncate">
                                            Checklist
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="h-5 min-w-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                        >
                                            {report.items.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="estimations"
                                        className="rounded-lg px-2 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 sm:gap-2"
                                    >
                                        {showCompletionTab ? (
                                            <>
                                                <ClipboardList className="h-4 w-4 shrink-0" />
                                                <span className="font-medium text-xs sm:text-sm truncate">
                                                    Penyelesaian
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Package className="h-4 w-4 shrink-0" />
                                                <span className="font-medium text-xs sm:text-sm truncate">
                                                    Estimasi
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="h-5 min-w-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                                >
                                                    {report.estimations.length}
                                                </Badge>
                                            </>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="rounded-lg px-2 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 sm:gap-2"
                                    >
                                        <History className="h-4 w-4 shrink-0" />
                                        <span className="font-medium text-xs sm:text-sm truncate">
                                            Riwayat
                                        </span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent
                                value="checklist"
                                className="space-y-3 mt-0"
                            >
                                <ChecklistTab
                                    items={report.items}
                                    estimations={report.estimations}
                                    formatCurrency={formatCurrency}
                                    onPhotoClick={setLightboxSrc}
                                />
                            </TabsContent>

                            <TabsContent value="estimations" className="mt-0">
                                {showCompletionTab ? (
                                    <CompletionTab
                                        items={report.items}
                                        estimations={report.estimations}
                                        startSelfieUrls={report.startSelfieUrls}
                                        startReceiptUrls={
                                            report.startReceiptUrls
                                        }
                                        startMaterialStores={
                                            report.startMaterialStores
                                        }
                                        completionAdditionalPhotos={
                                            report.completionAdditionalPhotos
                                        }
                                        completionAdditionalNote={
                                            report.completionAdditionalNote
                                        }
                                        formatCurrency={formatCurrency}
                                        onPhotoClick={setLightboxSrc}
                                        isReviewer={
                                            isBmcReviewer || isBnmReviewer
                                        }
                                        onSectionViewed={handleSectionViewed}
                                        viewedSections={viewedSections}
                                    />
                                ) : (
                                    <EstimationsTab
                                        estimations={report.estimations}
                                        totalEstimation={report.totalEstimation}
                                        formatCurrency={formatCurrency}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                                <HistoryTab
                                    activities={report.activities}
                                    formatDate={formatDate}
                                    formatTime={formatTime}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            <MobileCtaBar report={report} viewer={viewer} actions={actions} />

            <Footer />

            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={lightboxSrc}
                            alt="Foto Item"
                            className="w-full h-full object-contain rounded-lg max-h-[85vh]"
                        />
                        <button
                            onClick={closeLightbox}
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
