"use client";

import {
    CheckCircle2,
    FilePenLine,
    PlusCircle,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/app/dashboard/queries";
import { getActivityActionLabel } from "@/app/dashboard/activity/activity-format";
import { formatJakartaDate } from "@/lib/time";

export type ActivityEventTone = "created" | "approved" | "rejected" | "revision";

type ActivityListProps = {
    items: ActivityItem[];
    className?: string;
};

const ACTIVITY_TONE_STYLES: Record<
    ActivityEventTone,
    {
        icon: LucideIcon;
        iconWrap: string;
        iconColor: string;
        badgeClass: string;
        badgeLabel: string;
    }
> = {
    created: {
        icon: PlusCircle,
        iconWrap: "bg-sky-500/12",
        iconColor: "text-sky-600 dark:text-sky-400",
        badgeClass: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
        badgeLabel: "Dibuat",
    },
    approved: {
        icon: CheckCircle2,
        iconWrap: "bg-emerald-500/12",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        badgeClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        badgeLabel: "Disetujui",
    },
    rejected: {
        icon: XCircle,
        iconWrap: "bg-destructive/12",
        iconColor: "text-destructive",
        badgeClass: "bg-destructive/12 text-destructive",
        badgeLabel: "Ditolak",
    },
    revision: {
        icon: FilePenLine,
        iconWrap: "bg-amber-500/12",
        iconColor: "text-amber-700 dark:text-amber-400",
        badgeClass: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
        badgeLabel: "Perlu Revisi",
    },
};

function resolveTone(action: string): ActivityEventTone {
    if (action.includes("REJECTED_REVISION")) return "revision";
    if (action.includes("REJECTED")) return "rejected";
    if (action.includes("APPROVED")) return "approved";
    return "created";
}

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
});

export function BmsMobileActivityList({ items, className }: ActivityListProps) {
    const sortedItems = [...items].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );

    const groupedItems = sortedItems.reduce<
        Record<string, { label: string; items: ActivityItem[]; dateMs: number }>
    >((groups, item) => {
        const label = formatJakartaDate(item.createdAt);
        if (!groups[label]) {
            groups[label] = {
                label,
                items: [],
                dateMs: item.createdAt.getTime(),
            };
        }
        groups[label].items.push(item);
        return groups;
    }, {});

    const groups = Object.values(groupedItems).sort(
        (a, b) => b.dateMs - a.dateMs,
    );

    if (sortedItems.length === 0) {
        return (
            <Card
                className={cn(
                    "border-dashed border-border/70 bg-card/60",
                    className,
                )}
            >
                <CardContent className="text-center text-sm text-muted-foreground pt-6">
                    Tidak ada aktivitas pada filter yang dipilih.
                </CardContent>
            </Card>
        );
    }

    return (
        <section className={cn("flex flex-col gap-4", className)}>
            {groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                    <h2 className="px-1 font-heading text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                        {group.label}
                    </h2>

                    <div className="flex flex-col gap-2">
                        {group.items.map((item) => {
                            const tone =
                                ACTIVITY_TONE_STYLES[resolveTone(item.action)];
                            const Icon = tone.icon;

                            return (
                                <Card
                                    key={item.id}
                                    className="bg-card/95 shadow-sm ring-1 ring-border/60 py-0 overflow-hidden"
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                                                    tone.iconWrap,
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "size-5",
                                                        tone.iconColor,
                                                    )}
                                                />
                                            </div>

                                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold tracking-tight">
                                                            Laporan #
                                                            {item.reportNumber}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {
                                                                item.report
                                                                    .branchName
                                                            }{" "}
                                                            •{" "}
                                                            {
                                                                item.report
                                                                    .storeName
                                                            }
                                                        </p>
                                                    </div>

                                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                                        {timeFormatter.format(
                                                            new Date(
                                                                item.createdAt,
                                                            ),
                                                        )}
                                                    </span>
                                                </div>

                                                <p className="text-xs leading-relaxed text-foreground/85">
                                                    <span className="font-semibold">
                                                        {item.actor.name}
                                                    </span>
                                                    <span className="text-muted-foreground"></span>{" "}
                                                    {getActivityActionLabel(
                                                        item.action,
                                                    )}
                                                </p>

                                                <Badge
                                                    className={cn(
                                                        "w-fit text-[10px] uppercase font-semibold",
                                                        tone.badgeClass,
                                                    )}
                                                >
                                                    {tone.badgeLabel}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
        </section>
    );
}
