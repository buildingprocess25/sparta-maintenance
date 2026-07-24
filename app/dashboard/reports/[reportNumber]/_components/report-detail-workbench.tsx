"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    AlertTriangle,
    Archive,
    ClipboardList,
    GalleryHorizontal,
    History,
    Package,
    Trash2,
} from "lucide-react";

import { archiveAdminReport, deleteAdminReport } from "../../actions";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasCompletePreventiveEvidence } from "@/lib/report-preventive";
import type { DetailPhoto, ReportDetailModel } from "../_lib/detail-data";
import { ActionsTab } from "./actions-tab";
import { ApprovalReviewTour } from "./approval-review-tour";
import { ChecklistTab } from "./checklist-tab";
import { DocumentationTab } from "./documentation-tab";
import { HistoryTab } from "./history-tab";
import { PhotoDialog } from "./photo-dialog";
import { ReportApprovalActions } from "./report-approval-actions";
import { ReportHeader } from "./report-header";
import { WorkCostTab } from "./work-cost-tab";
import { useReportApprovalReviewGate } from "./report-approval-review-gate";

type Props = {
    report: ReportDetailModel;
    viewerRole: string;
    approvalContext: {
        reportNumber: string;
        status: string;
        viewerRole: string;
    } | null;
};

export function ReportDetailWorkbench({
    report,
    viewerRole,
    approvalContext,
}: Props) {
    const router = useRouter();
    const reviewGate = useReportApprovalReviewGate();
    const isAdmin = viewerRole === "ADMIN";
    const isArchived = report.status === "ARCHIVED_PREVENTIVE";
    const hasPreventiveEvidence = hasCompletePreventiveEvidence(report.items);
    const canArchive =
        isAdmin &&
        hasPreventiveEvidence &&
        report.status !== "DRAFT" &&
        !isArchived;
    const didAutoFocusReview = useRef(false);
    const [activeTab, setActiveTab] = useState(
        reviewGate.enabled && !reviewGate.isReviewComplete
            ? "work"
            : "checklist",
    );
    const [selectedPhoto, setSelectedPhoto] = useState<DetailPhoto | null>(
        null,
    );
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    function handlePhotoSelect(photo: DetailPhoto) {
        reviewGate.markPhotoOpened(photo.id);
        setSelectedPhoto(photo);
    }
    const [isArchiving, startArchiveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

    function handleArchive() {
        startArchiveTransition(async () => {
            const result = await archiveAdminReport(report.reportNumber);
            if (result.error) {
                toast.error("Gagal mengarsipkan laporan", {
                    description: result.error,
                });
                return;
            }

            toast.success("Laporan berhasil diarsipkan");
            setArchiveOpen(false);
            router.push("/dashboard/preventive");
            router.refresh();
        });
    }

    function handleDelete() {
        startDeleteTransition(async () => {
            const result = await deleteAdminReport(
                report.reportNumber,
                deleteConfirmation,
            );
            if (result.error) {
                toast.error("Gagal menghapus laporan", {
                    description: result.error,
                });
                return;
            }

            toast.success("Laporan berhasil dihapus");
            setDeleteOpen(false);
            router.push("/dashboard/reports");
            router.refresh();
        });
    }

    useEffect(() => {
        if (
            didAutoFocusReview.current ||
            !reviewGate.enabled ||
            reviewGate.isReviewComplete
        ) {
            return;
        }

        didAutoFocusReview.current = true;

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                document
                    .querySelector<HTMLElement>("[data-review-required='true']")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
            });
        });
    }, [reviewGate.enabled, reviewGate.isReviewComplete]);

    return (
        <div className="min-h-full bg-muted/30">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="gap-0"
            >
                <ReportHeader report={report} viewerRole={viewerRole} />

                <div className="sticky top-15 z-40 border-b bg-background/95 px-3 pt-2 backdrop-blur transition-[top] supports-backdrop-filter:bg-background/80 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 lg:px-4">
                    <div className="max-w-none overflow-x-auto overflow-y-hidden pb-1">
                        <TabsList
                            variant="line"
                            className="h-8 w-max justify-start rounded-none p-0"
                        >
                            <TabsTrigger
                                value="checklist"
                                className="h-8 flex-none px-3 text-xs"
                            >
                                <ClipboardList data-icon="inline-start" />
                                Checklist
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    {report.summary.checklistCount}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="work"
                                className="h-8 flex-none px-3 text-xs"
                            >
                                <Package data-icon="inline-start" />
                                Pekerjaan & Biaya BMS
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                    {report.summary.workItemCount}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="docs"
                                className="h-8 flex-none px-3 text-xs"
                            >
                                <GalleryHorizontal data-icon="inline-start" />
                                Dokumentasi
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    {report.summary.photoCount}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="h-8 flex-none px-3 text-xs"
                            >
                                <History data-icon="inline-start" />
                                Riwayat Aktivitas
                            </TabsTrigger>
                            {isAdmin ? (
                                <TabsTrigger
                                    value="actions"
                                    className="h-8 flex-none px-3 text-xs"
                                >
                                    <AlertTriangle data-icon="inline-start" />
                                    Aksi
                                </TabsTrigger>
                            ) : null}
                        </TabsList>
                    </div>
                </div>

                <main className="w-full max-w-none p-3 pb-48 md:pb-32 lg:p-4 lg:pb-32">
                    <TabsContent value="checklist" className="mt-0">
                        <ChecklistTab
                            report={report}
                            onPhotoClick={handlePhotoSelect}
                        />
                    </TabsContent>

                    <TabsContent value="work" className="mt-0">
                        <WorkCostTab
                            report={report}
                            onPhotoClick={handlePhotoSelect}
                        />
                    </TabsContent>

                    <TabsContent value="docs" className="mt-0">
                        <DocumentationTab
                            report={report}
                            onPhotoClick={handlePhotoSelect}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <HistoryTab report={report} />
                    </TabsContent>

                    {isAdmin ? (
                        <TabsContent value="actions" className="mt-0">
                            <ActionsTab
                                report={report}
                                canArchive={canArchive}
                                hasPreventiveEvidence={hasPreventiveEvidence}
                                onArchiveClick={() => setArchiveOpen(true)}
                                onDeleteClick={() => setDeleteOpen(true)}
                            />
                        </TabsContent>
                    ) : null}
                </main>
            </Tabs>

            <PhotoDialog
                photo={selectedPhoto}
                photos={report.photos}
                onPhotoChange={handlePhotoSelect}
                onOpenChange={(open) => {
                    if (!open) setSelectedPhoto(null);
                }}
            />

            {approvalContext ? (
                <section
                    data-tour="approval-review-bar"
                    className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-5xl rounded-lg border bg-background/95 p-3 shadow-2xl backdrop-blur supports-backdrop-filter:bg-background/90 lg:inset-x-6"
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold">
                                Keputusan approval laporan
                            </p>
                            {reviewGate.enabled &&
                            !reviewGate.isReviewComplete ? (
                                <p className="mt-1 text-xs text-amber-700">
                                    {reviewGate.missingReviewText}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Periksa data sebelum menentukan keputusan.
                                </p>
                            )}
                        </div>
                        <ReportApprovalActions
                            reportNumber={approvalContext.reportNumber}
                            status={approvalContext.status}
                            viewerRole={approvalContext.viewerRole}
                        />
                    </div>
                </section>
            ) : null}

            {approvalContext ? (
                <ApprovalReviewTour
                    enabled={reviewGate.enabled}
                    status={approvalContext.status}
                    viewerRole={approvalContext.viewerRole}
                />
            ) : null}

            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <Archive />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                            Arsipkan laporan ini?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Laporan {report.reportNumber} tidak lagi muncul
                            dalam proses operasional. Bukti Preventive tetap
                            tersimpan dan toko tetap tercatat sudah Preventive.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isArchiving}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isArchiving}
                            onClick={(event) => {
                                event.preventDefault();
                                handleArchive();
                            }}
                        >
                            <Archive data-icon="inline-start" />
                            {isArchiving ? "Mengarsipkan..." : "Arsipkan"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) setDeleteConfirmation("");
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                            <AlertTriangle />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Hapus laporan ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Data laporan {report.reportNumber} akan dihapus
                            permanen dari database. File di Google Drive tidak
                            ikut dihapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {hasPreventiveEvidence ? (
                        <p className="text-sm font-medium text-destructive">
                            Toko dapat kehilangan status sudah Preventive.
                        </p>
                    ) : null}
                    <div className="grid gap-2">
                        <label
                            htmlFor="delete-report-confirmation"
                            className="text-sm font-medium"
                        >
                            Ketik {report.reportNumber} untuk mengonfirmasi
                        </label>
                        <Input
                            id="delete-report-confirmation"
                            value={deleteConfirmation}
                            onChange={(event) =>
                                setDeleteConfirmation(event.target.value)
                            }
                            placeholder={report.reportNumber}
                            autoComplete="off"
                            disabled={isDeleting}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={
                                isDeleting ||
                                deleteConfirmation !== report.reportNumber
                            }
                            onClick={(event) => {
                                event.preventDefault();
                                handleDelete();
                            }}
                        >
                            <Trash2 data-icon="inline-start" />
                            {isDeleting ? "Menghapus..." : "Hapus permanen"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
