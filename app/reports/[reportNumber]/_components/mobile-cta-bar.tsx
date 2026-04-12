import {
    CheckCircle2,
    Loader2,
    WrenchIcon,
    XCircle,
    FileText,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReportData, Viewer, ActionState } from "./types";

type Props = {
    report: ReportData;
    viewer: Viewer;
    actions: ActionState;
};

export function MobileCtaBar({ report, viewer, actions }: Props) {
    const {
        isPending,
        notesInput,
        setNotesInput,
        activeDialog,
        setActiveDialog,
        handleReviewEstimation,
        handleReviewCompletion,
        handleFinalApproval,
    } = actions;

    const estimationRejectionNote =
        [...report.activities]
            .reverse()
            .find((a) => a.action === "ESTIMATION_REJECTED_REVISION")?.notes ||
        "Perbarui laporan estimasi ini berdasarkan catatan/alasan penolakan dari BMC.";

    const latestWorkRejectionActivity = [...report.activities]
        .reverse()
        .find(
            (a) =>
                a.action === "WORK_REJECTED_REVISION" ||
                a.action === "FINAL_REJECTED_REVISION_BNM",
        );

    const workRejectionNote =
        latestWorkRejectionActivity?.notes ||
        "Perbaiki dan kirim ulang laporan penyelesaian.";

    const rejectionNoteTitle =
        latestWorkRejectionActivity?.action === "FINAL_REJECTED_REVISION_BNM"
            ? "Catatan Penolakan BNM"
            : "Catatan Penolakan BMC";

    const hasWorkflowAction =
        (viewer.role === "BMS" &&
            (report.status === "ESTIMATION_APPROVED" ||
                report.status === "ESTIMATION_REJECTED_REVISION" ||
                report.status === "IN_PROGRESS" ||
                report.status === "REVIEW_REJECTED_REVISION")) ||
        (viewer.role === "BMC" &&
            (report.status === "PENDING_ESTIMATION" ||
                report.status === "PENDING_REVIEW")) ||
        (viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC");

    if (!hasWorkflowAction) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur border-t border-border px-4 py-3 safe-area-pb">
            {/* BMS: start work */}
            {viewer.role === "BMS" &&
                report.status === "ESTIMATION_APPROVED" && (
                    <Link prefetch={false}
                        href={`/reports/start-work?report=${report.reportNumber}`}
                        className="block w-full"
                    >
                        <Button className="w-full" size="lg">
                            <WrenchIcon className="h-4 w-4 mr-2" />
                            Mulai Pengerjaan
                        </Button>
                    </Link>
                )}

            {/* BMS: submit completion */}
            {viewer.role === "BMS" &&
                (report.status === "IN_PROGRESS" ||
                    report.status === "REVIEW_REJECTED_REVISION") && (
                    <div className="w-full space-y-3">
                        {report.status === "REVIEW_REJECTED_REVISION" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-800">
                                    {rejectionNoteTitle}:
                                </p>
                                <p className="text-xs text-red-700 mt-0.5 italic whitespace-pre-line">
                                    {workRejectionNote}
                                </p>
                            </div>
                        )}
                        <Link prefetch={false}
                            href={`/reports/complete?report=${report.reportNumber}`}
                            className="block w-full"
                        >
                            <Button className="w-full" size="lg">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {report.status === "REVIEW_REJECTED_REVISION"
                                    ? "Kirim Ulang Laporan"
                                    : "Kirim Laporan Penyelesaian"}
                            </Button>
                        </Link>
                    </div>
                )}

            {/* BMS: edit estimation (revision) */}
            {viewer.role === "BMS" &&
                report.status === "ESTIMATION_REJECTED_REVISION" && (
                    <div className="w-full space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-800">
                                Catatan Penolakan:
                            </p>
                            <p className="text-xs text-red-700 mt-0.5 italic whitespace-pre-line">
                                {estimationRejectionNote}
                            </p>
                        </div>
                        <Link prefetch={false}
                            href={`/reports/edit/${report.reportNumber}`}
                            className="block w-full"
                        >
                            <Button className="w-full" size="lg">
                                <FileText className="h-4 w-4 mr-2" />
                                Revisi Estimasi
                            </Button>
                        </Link>
                    </div>
                )}

            {/* BMC: review estimation */}
            {viewer.role === "BMC" &&
                report.status === "PENDING_ESTIMATION" &&
                (activeDialog === "reject_estimation" ? (
                    <div className="space-y-2">
                        <textarea
                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            rows={2}
                            placeholder="Alasan penolakan (opsional)..."
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-none"
                                onClick={() => {
                                    setActiveDialog(null);
                                    setNotesInput("");
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                    handleReviewEstimation("reject_revision")
                                }
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Tolak & Revisi"
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-none text-red-600 border-red-200"
                                onClick={() => handleReviewEstimation("reject")}
                                disabled={isPending}
                            >
                                Tutup
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => handleReviewEstimation("approve")}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Setujui
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setActiveDialog("reject_estimation")}
                            disabled={isPending}
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                        </Button>
                    </div>
                ))}

            {/* BMC: review completion */}
            {viewer.role === "BMC" &&
                report.status === "PENDING_REVIEW" &&
                (activeDialog === "reject_completion" ? (
                    <div className="space-y-2">
                        <textarea
                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            rows={2}
                            placeholder="Alasan penolakan (opsional)..."
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-none"
                                onClick={() => {
                                    setActiveDialog(null);
                                    setNotesInput("");
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                    handleReviewCompletion("reject_revision")
                                }
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Tolak & Revisi"
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => handleReviewCompletion("approve")}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Setujui
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setActiveDialog("reject_completion")}
                            disabled={isPending}
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                        </Button>
                    </div>
                ))}

            {/* BNM: final review completion */}
            {viewer.role === "BNM_MANAGER" &&
                report.status === "APPROVED_BMC" &&
                (activeDialog === "reject_final" ? (
                    <div className="space-y-2">
                        <textarea
                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            rows={2}
                            placeholder="Alasan penolakan (wajib)..."
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-none"
                                onClick={() => {
                                    setActiveDialog(null);
                                    setNotesInput("");
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                    handleFinalApproval("reject_revision")
                                }
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Tolak & Revisi"
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => handleFinalApproval("approve")}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Setujui Final
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setActiveDialog("reject_final")}
                            disabled={isPending}
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                        </Button>
                    </div>
                ))}
        </div>
    );
}
