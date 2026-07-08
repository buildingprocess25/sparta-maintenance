import Link from "next/link";
import { WrenchIcon, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportData, Viewer } from "./types";

type Props = {
    report: ReportData;
    viewer: Viewer;
};

export function StickyCta({ report, viewer }: Props) {
    const hasWorkflowAction =
        viewer.role === "BMS" &&
        (report.status === "ESTIMATION_APPROVED" ||
            report.status === "ESTIMATION_REJECTED_REVISION" ||
            report.status === "IN_PROGRESS" ||
            report.status === "REVIEW_REJECTED_REVISION");

    if (!hasWorkflowAction) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
            <div className="mx-auto max-w-lg">
                {/* ── BMS: start work ── */}
                {report.status === "ESTIMATION_APPROVED" && (
                    <Link
                        prefetch={false}
                        href={`/reports/start-work?report=${report.reportNumber}`}
                        className="block w-full"
                    >
                        <Button className="w-full bg-[#0069a7] hover:bg-[#005a8f] text-white shadow-sm" size="lg">
                            <WrenchIcon className="h-5 w-5 mr-2" />
                            Mulai Pengerjaan
                        </Button>
                    </Link>
                )}

                {/* ── BMS: edit estimation (revision) ── */}
                {report.status === "ESTIMATION_REJECTED_REVISION" && (
                    <Link
                        prefetch={false}
                        href={`/reports/edit/${report.reportNumber}`}
                        className="block w-full"
                    >
                        <Button className="w-full bg-[#0069a7] hover:bg-[#005a8f] text-white shadow-sm" size="lg">
                            <FileText className="h-5 w-5 mr-2" />
                            Revisi Estimasi
                        </Button>
                    </Link>
                )}

                {/* ── BMS: submit completion ── */}
                {(report.status === "IN_PROGRESS" ||
                    report.status === "REVIEW_REJECTED_REVISION") && (
                    <Link
                        prefetch={false}
                        href={`/reports/complete?report=${report.reportNumber}`}
                        className="block w-full"
                    >
                        <Button className="w-full bg-[#0069a7] hover:bg-[#005a8f] text-white shadow-sm" size="lg">
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            {report.status === "REVIEW_REJECTED_REVISION"
                                ? "Kirim Ulang Laporan"
                                : "Kirim Laporan Penyelesaian"}
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
