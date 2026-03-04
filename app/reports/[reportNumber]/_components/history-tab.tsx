import { Clock, User } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "./types";

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
        label: "Estimasi Disetujui",
        positive: true,
        negative: false,
    },
    ESTIMATION_REJECTED_REVISION: {
        label: "Estimasi Ditolak (Revisi)",
        positive: false,
        negative: true,
    },
    ESTIMATION_REJECTED: {
        label: "Estimasi Ditolak",
        positive: false,
        negative: true,
    },
    WORK_APPROVED: {
        label: "Penyelesaian Disetujui",
        positive: true,
        negative: false,
    },
    WORK_REJECTED_REVISION: {
        label: "Pekerjaan Ditolak (Revisi)",
        positive: false,
        negative: true,
    },
    FINALIZED: { label: "Laporan Selesai", positive: true, negative: false },
};

type Props = {
    activities: ActivityEntry[];
    formatDate: (d: Date) => string;
    formatTime: (d: Date) => string;
};

export function HistoryTab({ activities, formatDate, formatTime }: Props) {
    return (
        <Card className="shadow-sm border-border/60">
            <CardHeader className="border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Riwayat Aktivitas
                </CardTitle>
                <CardDescription>
                    Jejak persetujuan dan perubahan status laporan.
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {activities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        Belum ada riwayat aktivitas.
                    </div>
                ) : (
                    <div className="relative border-l border-muted ml-4 space-y-8 pb-2">
                        {[...activities].reverse().map((entry, i) => {
                            const cfg = ACTIVITY_HISTORY_CONFIG[
                                entry.action
                            ] ?? {
                                label: entry.action,
                                positive: false,
                                negative: false,
                            };
                            const isPositive = cfg.positive;
                            const isNegative = cfg.negative;

                            return (
                                <div key={i} className="relative pl-6">
                                    <div
                                        className={cn(
                                            "absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 bg-background transition-colors",
                                            isNegative
                                                ? "border-red-500 bg-red-50"
                                                : isPositive
                                                  ? "border-green-500 bg-green-50"
                                                  : "border-muted-foreground",
                                        )}
                                    />
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                        <div className="font-medium text-sm">
                                            {cfg.label}
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {formatDate(entry.createdAt)} •{" "}
                                            {formatTime(entry.createdAt)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                                        <User className="h-3 w-3" />
                                        <span>{entry.actorName}</span>
                                    </div>
                                    {entry.notes && (
                                        <div className="bg-muted/30 p-3 rounded-md border border-border/50 text-xs italic text-muted-foreground relative">
                                            <span className="absolute top-2 left-2 text-muted-foreground/20 text-xl font-serif leading-none">
                                                &quot;
                                            </span>
                                            <span className="pl-3 relative z-10">
                                                {entry.notes}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
