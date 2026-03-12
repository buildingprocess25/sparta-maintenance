import { CheckCircle2, Loader2, WrenchIcon, XCircle } from "lucide-react";
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
    } = actions;

    const hasWorkflowAction =
        (viewer.role === "BMS" &&
            (report.status === "ESTIMATION_APPROVED" ||
                report.status === "IN_PROGRESS" ||
                report.status === "REVIEW_REJECTED_REVISION")) ||
        (viewer.role === "BMC" &&
            (report.status === "PENDING_ESTIMATION" ||
                report.status === "PENDING_REVIEW"));

    if (!hasWorkflowAction) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur border-t border-border px-4 py-3 safe-area-pb">
            {/* BMS: start work */}
            {viewer.role === "BMS" &&
                report.status === "ESTIMATION_APPROVED" && (
                    <Link
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
                    <Link
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
        </div>
    );
}
