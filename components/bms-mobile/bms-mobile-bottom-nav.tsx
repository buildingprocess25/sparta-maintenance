"use client";

import type { ElementType } from "react";
import Link from "next/link";
import {
  IconFileText,
  IconFileTextFilled,
  IconClock,
  IconClockFilled,
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconShieldCheck,
  IconShieldCheckFilled,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type BmsMobileNavItem = "dashboard" | "reports" | "activity" | "coverage" | "menu";

type BmsMobileBottomNavProps = {
  activeItem: BmsMobileNavItem;
  className?: string;
};

type LinkItem = {
  key: Exclude<BmsMobileNavItem, "menu">;
  label: string;
  href: string;
  icon: ElementType;
  activeIcon: ElementType;
};

const LINK_ITEMS: LinkItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: IconLayoutDashboard,
    activeIcon: IconLayoutDashboardFilled,
  },
  {
    key: "reports",
    label: "Laporan",
    href: "/reports",
    icon: IconFileText,
    activeIcon: IconFileTextFilled,
  },
  {
    key: "activity",
    label: "Aktivitas",
    href: "/activity",
    icon: IconClock,
    activeIcon: IconClockFilled,
  },
  {
    key: "coverage",
    label: "Preventif",
    href: "/dashboard/coverage",
    icon: IconShieldCheck,
    activeIcon: IconShieldCheckFilled,
  },
];

function NavButton({
  isActive,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
}: {
  isActive: boolean;
  icon: ElementType;
  activeIcon: ElementType;
  label: string;
}) {
  const DisplayIcon = isActive ? ActiveIcon : Icon;
  return (
    <span
      className={cn(
        "flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <DisplayIcon className="size-6" stroke={1.5} />
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wide">
        {label}
      </span>
    </span>
  );
}

export function BmsMobileBottomNav({
  activeItem,
  className,
}: BmsMobileBottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[calc(env(safe-area-inset-bottom)+15px)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1 px-4 pb-3 pt-2">
        {LINK_ITEMS.map((item) => {
          const isActive = item.key === activeItem;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <NavButton
                isActive={isActive}
                icon={item.icon}
                activeIcon={item.activeIcon}
                label={item.label}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
