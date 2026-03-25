import Link from "next/link";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityItem, PjumActivityItem } from "../../queries";

const ACTIVITY_CONFIG: Record<
    string,
    { label: string; color: string; dot: string }
> = {
    SUBMITTED: {
        label: "Laporan diajukan",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        dot: "bg-yellow-500",
    },
    PJUM_CREATED: {
        label: "PJUM diajukan",
        color: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
    },
    PJUM_APPROVED: {
        label: "PJUM disetujui",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
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
                                                    className={`text-xs px-1.5 md:px-2 py-0 h-4 md:h-5 border ${cfg.color}`}
                                                >
                                                    {cfg.label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs md:text-sm text-foreground truncate">
                                                {item.report.storeName ||
                                                    item.report.branchName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
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

// ─── Wide variant ─────────────────────────────────────────────────────────────
// Designed for use in the 3/4-width right column. Items are laid out as
// compact horizontal rows showing all key info without wrapping.

export function ActivitySectionWide({
    activities,
    emptyMessage,
}: ActivitySectionProps) {
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Aktivitas Terbaru
                </h2>
                <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    asChild
                >
                    <Link href="/activity">Lihat Semua</Link>
                </Button>
            </div>

            {activities.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {emptyMessage ??
                            "Laporan dan aktivitas terbaru akan muncul di sini."}
                    </p>
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
                                    className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] items-start md:items-center gap-1.5 md:gap-x-4 px-4 py-3 md:py-2.5 hover:bg-muted/40 transition-colors"
                                >
                                    {/* Left: dot + badge */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`}
                                        />
                                        <Badge
                                            variant="outline"
                                            className={`text-xs px-1.5 py-0 h-4.5 border whitespace-nowrap ${cfg.color}`}
                                        >
                                            {cfg.label}
                                        </Badge>
                                    </div>

                                    {/* Middle: report number + store */}
                                    <div className="w-full min-w-0 flex items-center gap-2 md:gap-3 pl-4 md:pl-0">
                                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                                            {item.reportNumber}
                                        </span>
                                        <span className="text-xs text-foreground truncate">
                                            {item.report.storeName ||
                                                item.report.branchName}
                                        </span>
                                    </div>

                                    {/* Right: actor · time */}
                                    <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pl-4 md:pl-0">
                                        {item.actor.name} ·{" "}
                                        {formatRelativeDate(
                                            new Date(item.createdAt),
                                        )}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export interface PjumActivitySectionProps {
    activities: PjumActivityItem[];
    emptyMessage?: string;
}

export function PjumActivitySectionWide({
    activities,
    emptyMessage,
}: PjumActivitySectionProps) {
    return (
        <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Aktivitas PJUM Terbaru
                </h2>
                <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    asChild
                >
                    <Link href="/activity">Lihat Semua</Link>
                </Button>
            </div>

            {activities.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {emptyMessage ??
                            "Aktivitas PJUM terbaru akan muncul di sini."}
                    </p>
                </div>
            ) : (
                <ul className="divide-y">
                    {activities.map((item) => {
                        const cfg =
                            ACTIVITY_CONFIG[item.action] ??
                            ACTIVITY_CONFIG["PJUM_CREATED"];
                        return (
                            <li key={item.id}>
                                <div className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] items-start md:items-center gap-1.5 md:gap-x-4 px-4 py-3 md:py-2.5 hover:bg-muted/40 transition-colors">
                                    {/* Left: dot + badge */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`}
                                        />
                                        <Badge
                                            variant="outline"
                                            className={`text-xs px-1.5 py-0 h-4.5 border whitespace-nowrap ${cfg.color}`}
                                        >
                                            {cfg.label}
                                        </Badge>
                                    </div>

                                    {/* Middle: label */}
                                    <div className="w-full min-w-0 flex items-center gap-2 md:gap-3 pl-4 md:pl-0">
                                        <span className="text-xs font-mono font-medium text-foreground shrink-0 truncate">
                                            {item.label}
                                        </span>
                                    </div>

                                    {/* Right: actor · time */}
                                    <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pl-4 md:pl-0">
                                        {item.actor.name} ·{" "}
                                        {formatRelativeDate(
                                            new Date(item.createdAt),
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
