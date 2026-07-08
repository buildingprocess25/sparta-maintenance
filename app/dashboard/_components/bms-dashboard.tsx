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
import { BmsWelcomeCard } from "./bms-welcome-card";
import { BmsMobileActivityItem } from "@/components/bms-mobile/bms-activity-item";



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

            <div className="flex flex-col">
                {activities.length === 0 ? (
                    <div className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground p-4">
                        Laporan dan aktivitas terbaru Anda akan muncul di sini.
                    </div>
                ) : (
                    activities.map((item) => (
                        <BmsMobileActivityItem 
                            key={item.id} 
                            item={item} 
                            showRelativeTime={true} 
                        />
                    ))
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
      userInitials={user.name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")}
    >
      <BmsWelcomeCard name={user.name} />

      <Button asChild size="lg" className="h-12 w-full">
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
