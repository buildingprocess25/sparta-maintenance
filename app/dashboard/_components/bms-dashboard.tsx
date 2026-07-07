import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    PlusCircle,
    Wrench,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import { BmsMobilePage } from "@/components/bms-mobile/bms-mobile-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    getActivityActionLabel,
    getActionBadgeClass,
} from "@/app/dashboard/activity/activity-format";
import { formatJakartaDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/authorization";
import { getBMSActivity, getUserStats, type ActivityItem } from "../queries";
import {
    BmsMobileDashboardStats,
    type BmsMobileDashboardStatItem,
} from "./bms-mobile-dashboard-stats";

type ActivityTone = "pending" | "approved" | "rejected";

const activityTone: Record<
    ActivityTone,
    { iconWrap: string; iconText: string; icon: LucideIcon }
> = {
    pending: {
        iconWrap: "bg-primary/12",
        iconText: "text-primary",
        icon: Clock,
    },
    approved: {
        iconWrap: "bg-emerald-500/12",
        iconText: "text-emerald-600",
        icon: CheckCircle2,
    },
    rejected: {
        iconWrap: "bg-destructive/12",
        iconText: "text-destructive",
        icon: XCircle,
    },
};

function resolveActivityTone(action: string): ActivityTone {
    if (action.includes("REJECTED")) return "rejected";
    if (action.includes("APPROVED")) return "approved";
    return "pending";
}

function formatRelativeDate(date: Date) {
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

    return formatJakartaDate(date);
}

function BmsMobileActivityList({ activities }: { activities: ActivityItem[] }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                    History Aktivitas
                </h2>
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href="/activity" className="text-xs font-semibold uppercase">
                        Lihat Semua
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-2">
                {activities.length === 0 ? (
                    <Card size="sm" className="bg-card/95 shadow-sm">
                        <CardContent className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">
                            Laporan dan aktivitas terbaru Anda akan muncul di sini.
                        </CardContent>
                    </Card>
                ) : (
                    activities.map((item) => {
                        const tone = activityTone[resolveActivityTone(item.action)];
                        const Icon = tone.icon;

                        return (
                            <Card
                                key={item.id}
                                size="sm"
                                className="relative overflow-hidden bg-card/95 shadow-sm ring-1 ring-border/50"
                            >
                                <CardContent className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                                            tone.iconWrap,
                                        )}
                                    >
                                        <Icon className={cn("size-5", tone.iconText)} />
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link
                                                href={`/reports/${item.reportNumber}`}
                                                className="min-w-0 text-sm font-medium leading-snug text-primary"
                                            >
                                                <span className="truncate">
                                                    #{item.reportNumber}
                                                </span>
                                            </Link>
                                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                                {formatRelativeDate(
                                                    new Date(item.createdAt),
                                                )}
                                            </span>
                                        </div>

                                        <p className="truncate text-xs text-muted-foreground">
                                            {item.report.storeName ||
                                                item.report.branchName}
                                        </p>

                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "w-fit text-[10px] uppercase",
                                                getActionBadgeClass(item.action),
                                            )}
                                        >
                                            {getActivityActionLabel(item.action)}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export async function BmsDashboard({ user }: { user: AuthUser }) {
    const [stats, activities] = await Promise.all([
        getUserStats(user.NIK),
        getBMSActivity(user.NIK),
    ]);
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
    }).format(new Date());

    const statItems: BmsMobileDashboardStatItem[] = [
        {
            key: "need-action",
            total: stats.needsAction,
            label: "Perlu Tindakan",
            icon: AlertCircle,
            tone: "critical",
            caption: "Revisi / mulai pekerjaan",
            href: "/reports?status=needs_action",
        },
        {
            key: "waiting-review",
            total: stats.waitingReview,
            label: "Menunggu Review",
            icon: Clock,
            tone: "pending",
            caption: "Diproses BMC / BNM",
            href: "/reports?status=waiting_review",
        },
        {
            key: "in-progress",
            total: stats.inProgress,
            label: "Dikerjakan",
            icon: Wrench,
            tone: "progress",
            caption: "Pekerjaan berjalan",
            href: "/reports?status=in_progress",
        },
        {
            key: "completed",
            total: stats.completed,
            label: "Selesai",
            icon: CheckCircle2,
            tone: "done",
            caption: "Final BNM disetujui",
            href: "/reports?status=completed",
        },
    ];

    return (
        <BmsMobilePage
            navItem="dashboard"
            profileName={user.name}
            jobTitle="Building Maintenance Support"
            showNotificationDot
        >
            <section className="flex flex-col gap-1">
                <h2 className="font-heading text-2xl font-bold leading-tight tracking-tight">
                    Selamat Pagi
                </h2>
                <p className="text-sm text-muted-foreground">
                    {formattedDate} · {stats.needsAction} perlu tindakan
                </p>
            </section>

            <Button
                asChild
                size="lg"
                className="h-12 w-full bg-linear-to-r from-primary to-primary/85 shadow-lg shadow-primary/20"
            >
                <Link href="/reports/create">
                    <PlusCircle data-icon="inline-start" />
                    Buat Laporan Baru
                </Link>
            </Button>

            <BmsMobileDashboardStats items={statItems} />
            <BmsMobileActivityList activities={activities} />
        </BmsMobilePage>
    );
}
