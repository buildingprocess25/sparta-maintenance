import Link from "next/link";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityItem } from "../../queries";

const ACTIVITY_CONFIG: Record<
    string,
    { label: string; color: string; dot: string }
> = {
    SUBMITTED: {
        label: "Laporan diajukan",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        dot: "bg-yellow-500",
    },
    RESUBMITTED_ESTIMATION: {
        label: "Laporan direvisi & diajukan ulang",
        color: "bg-orange-100 text-orange-700 border-orange-200",
        dot: "bg-orange-500",
    },
    RESUBMITTED_WORK: {
        label: "Pekerjaan direvisi & diajukan ulang",
        color: "bg-orange-100 text-orange-700 border-orange-200",
        dot: "bg-orange-500",
    },
    WORK_STARTED: {
        label: "Pekerjaan dimulai",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
    },
    COMPLETION_SUBMITTED: {
        label: "Pekerjaan selesai diajukan",
        color: "bg-purple-100 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
    },
    ESTIMATION_APPROVED: {
        label: "Estimasi disetujui",
        color: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-500",
    },
    ESTIMATION_REJECTED_REVISION: {
        label: "Estimasi ditolak (revisi)",
        color: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
    },
    ESTIMATION_REJECTED: {
        label: "Estimasi ditolak",
        color: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
    },
    WORK_APPROVED: {
        label: "Pekerjaan disetujui BMC",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
    },
    WORK_REJECTED_REVISION: {
        label: "Pekerjaan ditolak (revisi)",
        color: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
    },
    FINALIZED: {
        label: "Laporan selesai",
        color: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-600",
    },
};

function formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return "Kemarin";
    if (diffDay < 7) return `${diffDay} hari lalu`;

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: diffDay > 365 ? "numeric" : undefined,
    });
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    emptyMessage?: string;
}

export function ActivityFeed({ activities, emptyMessage }: ActivityFeedProps) {
    return (
        <Card className="h-fit">
            <CardContent className="p-0">
                {activities.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-50">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Activity className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-medium">Belum ada aktivitas</h3>
                            <p className="text-sm text-muted-foreground max-w-45">
                                {emptyMessage ??
                                    "Laporan dan aktivitas terbaru akan muncul di sini."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {activities.map((item) => {
                            const cfg =
                                ACTIVITY_CONFIG[item.action] ??
                                ACTIVITY_CONFIG["SUBMITTED"];
                            return (
                                <li key={item.id}>
                                    <Link
                                        href={`/reports/${item.reportNumber}`}
                                        className="flex items-start gap-3 px-4 md:px-5 py-3 md:py-4 hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Status dot */}
                                        <span
                                            className={`mt-1.5 h-2 md:h-2.5 w-2 md:w-2.5 shrink-0 rounded-full ${cfg.dot}`}
                                        />

                                        <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                <span className="text-xs md:text-sm font-medium font-mono text-muted-foreground">
                                                    {item.reportNumber}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0 h-4 md:h-5 border ${cfg.color}`}
                                                >
                                                    {cfg.label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs md:text-sm text-foreground truncate">
                                                {item.report.storeName ||
                                                    item.report.branchName}
                                            </p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">
                                                {item.actor.name} ·{" "}
                                                {formatRelativeDate(
                                                    new Date(item.createdAt),
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

interface ActivitySectionProps {
    activities: ActivityItem[];
    emptyMessage?: string;
}

export function ActivitySection({
    activities,
    emptyMessage,
}: ActivitySectionProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Aktivitas Terbaru
                </h2>
                <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    asChild
                >
                    <Link href="/activity">Lihat Semua</Link>
                </Button>
            </div>
            <ActivityFeed activities={activities} emptyMessage={emptyMessage} />
        </div>
    );
}
