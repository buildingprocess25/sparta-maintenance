import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FilePenLine,
  PlusCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getActivityActionLabel,
  getActionBadgeClass,
} from "@/app/dashboard/activity/activity-format";
import type { ActivityItem } from "@/app/dashboard/queries";
import { formatJakartaDate } from "@/lib/time";

export type ActivityEventTone =
  | "created"
  | "approved"
  | "rejected"
  | "revision"
  | "pending";

export const ACTIVITY_TONE_STYLES: Record<
  ActivityEventTone,
  {
    icon: LucideIcon;
    iconWrap: string;
    iconColor: string;
  }
> = {
  created: {
    icon: PlusCircle,
    iconWrap: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  pending: {
    icon: Clock,
    iconWrap: "bg-primary/10",
    iconColor: "text-primary",
  },
  approved: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    icon: XCircle,
    iconWrap: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  revision: {
    icon: FilePenLine,
    iconWrap: "bg-amber-500/10",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
};

export function resolveActivityTone(action: string): ActivityEventTone {
  if (action.includes("REJECTED_REVISION")) return "revision";
  if (action.includes("REJECTED")) return "rejected";
  if (action.includes("APPROVED")) return "approved";
  if (action.includes("CREATED") || action.includes("SUBMITTED"))
    return "created";
  return "pending";
}

export function formatRelativeDate(date: Date) {
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

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function BmsMobileActivityItem({
  item,
  showRelativeTime = false,
}: {
  item: ActivityItem;
  showRelativeTime?: boolean;
}) {
  const tone = ACTIVITY_TONE_STYLES[resolveActivityTone(item.action)];
  const Icon = tone.icon;

  const timeString = showRelativeTime
    ? formatRelativeDate(item.createdAt)
    : timeFormatter.format(item.createdAt);

  return (
    <Link
      href={`/reports/${item.reportNumber}`}
      className="group mb-2.5 block w-full rounded-xl bg-card p-3 border border-border/50 hover:bg-muted/40 transition-all"
    >
      <div className="flex gap-3">


        {/* Content Area */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {/* Top Row: Title & Badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground/95">
              #{item.reportNumber}
            </h3>
            <Badge
              variant="secondary"
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold border-transparent shadow-none shrink-0",
                getActionBadgeClass(item.action),
              )}
            >
              {getActivityActionLabel(item.action)}
            </Badge>
          </div>

          {/* Middle Row: Context */}
          <p className="truncate text-[11px] text-muted-foreground/80 font-medium">
            {item.report.storeCode || item.report.branchName} •{" "}
            {item.report.storeName}
          </p>

          {/* Bottom Row: Timestamp & Actor */}
          <p className="mt-1 truncate text-[10px] text-muted-foreground/70">
            {timeString} oleh{" "}
            <span className="font-medium text-muted-foreground/90">
              {item.actor.name}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
