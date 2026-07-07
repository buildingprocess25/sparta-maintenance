"use client";

import Link from "next/link";
import {
    Activity,
    CircleEllipsis,
    Key,
    LayoutDashboard,
    ReceiptText,
    type LucideIcon,
} from "lucide-react";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/app/dashboard/logout-button";

export type BmsMobileNavItem = "dashboard" | "reports" | "activity" | "menu";

type BmsMobileBottomNavProps = {
    activeItem: BmsMobileNavItem;
    className?: string;
};

type LinkItem = {
    key: Exclude<BmsMobileNavItem, "menu">;
    label: string;
    href: string;
    icon: LucideIcon;
};

const LINK_ITEMS: LinkItem[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        key: "reports",
        label: "Laporan",
        href: "/reports",
        icon: ReceiptText,
    },
    {
        key: "activity",
        label: "Aktivitas",
        href: "/activity",
        icon: Activity,
    },
];

function NavButton({
    isActive,
    icon: Icon,
    label,
}: {
    isActive: boolean;
    icon: LucideIcon;
    label: string;
}) {
    return (
        <span
            className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors",
                isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
        >
            <Icon className="size-5" />
            <span className="mt-2 text-[8px] font-bold uppercase tracking-wide">
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
                                label={item.label}
                            />
                        </Link>
                    );
                })}

                <Sheet>
                    <SheetTrigger asChild>
                        <button type="button" aria-label="Buka menu">
                            <NavButton
                                isActive={activeItem === "menu"}
                                icon={CircleEllipsis}
                                label="Menu"
                            />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="mx-auto max-w-lg">
                        <SheetHeader>
                            <SheetTitle>Menu</SheetTitle>
                            <SheetDescription>
                                Pengaturan akun dan sesi pengguna.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="flex flex-col gap-2 px-4 pb-4">
                            <ChangePasswordDialog
                                trigger={
                                    <Button variant="outline" className="justify-start">
                                        <Key data-icon="inline-start" />
                                        Ganti Password
                                    </Button>
                                }
                            />
                            <div className="rounded-md border">
                                <LogoutButton />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
