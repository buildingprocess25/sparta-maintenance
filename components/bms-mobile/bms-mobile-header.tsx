"use client";

import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBmsMobileHeaderVisibility } from "./use-bms-mobile-header-visibility";

type BmsMobileHeaderProps = {
    title?: string;
    subtitle?: string;
    showBackButton?: boolean;
    backHref?: string;
    showNotificationDot?: boolean;
    profileName?: string;
    jobTitle?: string;
    className?: string;
};

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
}

export function BmsMobileHeader({
    title,
    subtitle,
    showBackButton = false,
    backHref = "/dashboard",
    showNotificationDot = false,
    profileName = "BMS",
    jobTitle = "Building Maintenance Support",
    className,
}: BmsMobileHeaderProps) {
    const isHeaderVisible = useBmsMobileHeaderVisibility();
    const resolvedTitle = title ?? profileName;
    const resolvedSubtitle = subtitle ?? jobTitle;

    return (
        <header
            className={cn(
                "fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform",
                isHeaderVisible ? "translate-y-0" : "-translate-y-full",
                className,
            )}
        >
            <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    {showBackButton ? (
                        <Button asChild variant="ghost" size="icon-sm">
                            <Link href={backHref} aria-label="Kembali">
                                <ArrowLeft data-icon="inline-start" />
                            </Link>
                        </Button>
                    ) : (
                        <Avatar className="size-9 rounded-xl">
                            <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold tracking-wide text-primary">
                                {getInitials(profileName) || "B"}
                            </AvatarFallback>
                        </Avatar>
                    )}

                    <div className="flex min-w-0 flex-col leading-tight">
                        <h1 className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                            {resolvedTitle}
                        </h1>
                        {resolvedSubtitle ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {resolvedSubtitle}
                            </p>
                        ) : null}
                    </div>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Lihat notifikasi"
                    className="relative rounded-full"
                >
                    <Bell />
                    {showNotificationDot ? (
                        <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
                    ) : null}
                </Button>
            </div>
        </header>
    );
}
