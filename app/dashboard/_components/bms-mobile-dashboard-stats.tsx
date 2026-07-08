import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BmsMobileDashboardStatTone =
  | "critical"
  | "pending"
  | "progress"
  | "done";

export type BmsMobileDashboardStatItem = {
  key: string;
  total: number;
  label: string;
  href: string;
  icon: LucideIcon;
  tone: BmsMobileDashboardStatTone;
  caption?: string;
};

type BmsMobileDashboardStatsProps = {
  items: BmsMobileDashboardStatItem[];
};

const toneClasses: Record<
  BmsMobileDashboardStatTone,
  {
    surface: string;
    value: string;
    label: string;
    caption: string;
    shape: string;
    icon: string;
  }
> = {
  critical: {
    surface: "bg-destructive/10",
    value: "text-destructive",
    label: "text-destructive/95",
    caption: "text-destructive/75",
    shape: "bg-destructive/25",
    icon: "text-destructive/40",
  },
  pending: {
    surface: "bg-amber-500/10",
    value: "text-amber-700",
    label: "text-amber-800/95",
    caption: "text-amber-800/75",
    shape: "bg-amber-500/25",
    icon: "text-amber-600/40",
  },
  progress: {
    surface: "bg-sky-500/10",
    value: "text-sky-700",
    label: "text-sky-800/95",
    caption: "text-sky-800/75",
    shape: "bg-sky-500/25",
    icon: "text-sky-600/40",
  },
  done: {
    surface: "bg-emerald-500/10",
    value: "text-emerald-700",
    label: "text-emerald-800/95",
    caption: "text-emerald-800/75",
    shape: "bg-emerald-500/25",
    icon: "text-emerald-600/40",
  },
};

export function BmsMobileDashboardStats({
  items,
}: BmsMobileDashboardStatsProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Stats Laporan
        </h2>
        <p className="text-xs text-muted-foreground">
          Ketuk kartu untuk membuka daftar laporan terkait.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = toneClasses[item.tone];

          return (
            <Link key={item.key} href={item.href}>
              <Card
                size="sm"
                className={cn(
                  "relative min-h-36 overflow-hidden ring-0",
                  tone.surface,
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-16 -top-16 size-36 rotate-12 rounded-[40%]",
                    tone.shape,
                  )}
                />
                <div className="pointer-events-none absolute right-4 top-4">
                  <Icon className={cn("size-8 rotate-12", tone.icon)} />
                </div>

                <CardHeader className="relative gap-3">
                  <CardTitle
                    className={cn(
                      "!text-4xl font-black tracking-tight",
                      tone.value,
                    )}
                  >
                    {item.total}
                  </CardTitle>
                  <div className="flex max-w-[86%] flex-col gap-1">
                    <CardDescription
                      className={cn(
                        "text-xs font-bold uppercase leading-snug tracking-wide",
                        tone.label,
                      )}
                    >
                      {item.label}
                    </CardDescription>
                    <p className={cn("text-[9px] leading-snug", tone.caption)}>
                      {item.caption ?? "Data diperbarui otomatis."}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
