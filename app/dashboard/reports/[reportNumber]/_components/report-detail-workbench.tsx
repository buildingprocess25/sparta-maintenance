"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    AlertTriangle,
    ClipboardList,
    GalleryHorizontal,
    History,
    Package,
    Trash2,
} from "lucide-react";

import { deleteAdminReport } from "../../actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DetailPhoto, ReportDetailModel } from "../_lib/detail-data";
import { ActionsTab } from "./actions-tab";
import { ChecklistTab } from "./checklist-tab";
import { DocumentationTab } from "./documentation-tab";
import { HistoryTab } from "./history-tab";
import { PhotoDialog } from "./photo-dialog";
import { ReportHeader } from "./report-header";
import { WorkCostTab } from "./work-cost-tab";

type Props = {
    report: ReportDetailModel;
};

export function ReportDetailWorkbench({ report }: Props) {
    const router = useRouter();
    const [selectedPhoto, setSelectedPhoto] = useState<DetailPhoto | null>(
        null,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();

    function handleDelete() {
        startDeleteTransition(async () => {
            const result = await deleteAdminReport(report.reportNumber);
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

    return (
        <div className="min-h-full bg-muted/30">
            <Tabs defaultValue="checklist" className="gap-0">
                <ReportHeader report={report} />

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
                            <TabsTrigger
                                value="actions"
                                className="h-8 flex-none px-3 text-xs"
                            >
                                <AlertTriangle data-icon="inline-start" />
                                Aksi
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <main className="w-full max-w-none p-3 lg:p-4">
                    <TabsContent value="checklist" className="mt-0">
                        <ChecklistTab
                            report={report}
                            onPhotoClick={setSelectedPhoto}
                        />
                    </TabsContent>

                    <TabsContent value="work" className="mt-0">
                        <WorkCostTab
                            report={report}
                            onPhotoClick={setSelectedPhoto}
                        />
                    </TabsContent>

                    <TabsContent value="docs" className="mt-0">
                        <DocumentationTab
                            report={report}
                            onPhotoClick={setSelectedPhoto}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <HistoryTab report={report} />
                    </TabsContent>

                    <TabsContent value="actions" className="mt-0">
                        <ActionsTab
                            report={report}
                            onDeleteClick={() => setDeleteOpen(true)}
                        />
                    </TabsContent>
                </main>
            </Tabs>

            <PhotoDialog
                photo={selectedPhoto}
                onOpenChange={(open) => {
                    if (!open) setSelectedPhoto(null);
                }}
            />

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                            <AlertTriangle />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Hapus laporan ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Laporan {report.reportNumber} akan dihapus bersama
                            checklist, estimasi, realisasi, approval log,
                            aktivitas, dan relasi PJUM terkait.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={handleDelete}
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
