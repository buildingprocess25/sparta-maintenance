import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "../types";
import { getReportStatusLabel } from "@/lib/report-status";
import { formatJakartaDate, formatJakartaDateTime } from "@/lib/time";

const ACTIVITY_HISTORY_CONFIG: Record<
    string,
    { label: string; positive: boolean; negative: boolean }
> = {
    SUBMITTED: { label: "Laporan Dikirim", positive: true, negative: false },
    RESUBMITTED_ESTIMATION: {
        label: "Laporan Direvisi & Dikirim Ulang",
        positive: true,
        negative: false,
    },
    RESUBMITTED_WORK: {
        label: "Pekerjaan Direvisi & Dikirim Ulang",
        positive: true,
        negative: false,
    },
    WORK_STARTED: {
        label: "Mulai Pengerjaan",
        positive: true,
        negative: false,
    },
    COMPLETION_SUBMITTED: {
        label: "Laporan Penyelesaian Dikirim",
        positive: true,
        negative: false,
    },
    ESTIMATION_APPROVED: {
        label: getReportStatusLabel("ESTIMATION_APPROVED"),
        positive: true,
        negative: false,
    },
    ESTIMATION_REJECTED_REVISION: {
        label: getReportStatusLabel("ESTIMATION_REJECTED_REVISION"),
        positive: false,
        negative: true,
    },
    ESTIMATION_REJECTED: {
        label: getReportStatusLabel("ESTIMATION_REJECTED"),
        positive: false,
        negative: true,
    },
    WORK_APPROVED: {
        label: "Penyelesaian Disetujui",
        positive: true,
        negative: false,
    },
    WORK_REJECTED_REVISION: {
        label: getReportStatusLabel("REVIEW_REJECTED_REVISION"),
        positive: false,
        negative: true,
    },
    FINAL_APPROVED_BNM: {
        label: "Persetujuan Final BNM",
        positive: true,
        negative: false,
    },
    FINAL_REJECTED_REVISION_BNM: {
        label: "Final Review BNM Ditolak (Revisi)",
        positive: false,
        negative: true,
    },
};

type Props = {
    activities: ActivityEntry[];
};

export function HistoryTabNew({ activities }: Props) {
    const formatDate = (date: Date) => formatJakartaDate(date);
    const formatTime = (date: Date) => {
        const dt = formatJakartaDateTime(date);
        const comma = dt.lastIndexOf(", ");
        return comma >= 0 ? dt.slice(comma + 2) : dt;
    };

    return (
        <div className="space-y-4 pb-6 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Clock className="h-4 w-4 text-[#0069a7]" />
                    Riwayat Aktivitas
                </h3>
            </div>
            <div className="pl-2">
                {activities.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 text-sm">
                        Belum ada riwayat aktivitas.
                    </div>
                ) : (
                    <div className="relative border-l border-slate-200 ml-4 space-y-8 pb-2">
                        {[...activities].reverse().map((entry, i) => {
                            const cfg = ACTIVITY_HISTORY_CONFIG[
                                entry.action
                            ] ?? {
                                label: entry.action,
                                positive: false,
                                negative: false,
                            };

                            return (
                                <div key={i} className="relative pl-6">
                                    <div
                                        className={cn(
                                            "absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 bg-white transition-colors",
                                            cfg.negative
                                                ? "border-amber-500 bg-amber-50"
                                                : cfg.positive
                                                  ? "border-emerald-500 bg-emerald-50"
                                                  : "border-slate-400",
                                        )}
                                    />
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                        <div className="font-medium text-sm text-slate-800">
                                            {cfg.label}
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono">
                                            {formatDate(entry.createdAt)} •{" "}
                                            {formatTime(entry.createdAt)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                                        <User className="h-3 w-3" />
                                        <span>{entry.actorName}</span>
                                    </div>
                                    {entry.notes && (
                                        <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-xs text-slate-600">
                                            <span className="italic">
                                                &quot;{entry.notes}&quot;
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
