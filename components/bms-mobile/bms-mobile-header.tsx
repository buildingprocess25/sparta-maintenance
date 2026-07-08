"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { IconKey } from "@tabler/icons-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBmsMobileHeaderVisibility } from "./use-bms-mobile-header-visibility";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { logoutAction } from "@/app/dashboard/action";

type BmsMobileHeaderProps = {
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
  userInitials?: string;
  className?: string;
};

export function BmsMobileHeader({
  title = "Dashboard",
  showBackButton = false,
  backHref = "/dashboard",
  userInitials = "BM",
  className,
}: BmsMobileHeaderProps) {
  const isHeaderVisible = useBmsMobileHeaderVisibility();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full",
          className,
        )}
      >
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          {/* Left: Back button or Title */}
          <div className="flex min-w-0 items-center gap-3">
            {showBackButton ? (
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={backHref} aria-label="Kembali">
                  <ArrowLeft data-icon="inline-start" />
                </Link>
              </Button>
            ) : null}

            <div className="font-medium">{title}</div>
          </div>

          {/* Right: Notification + Avatar */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menu profil"
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-bold tracking-wide text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setChangePasswordOpen(true);
                  }}
                >
                  <IconKey className="size-4" />
                  Ganti Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => logoutAction()}
                >
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Change Password Dialog (controlled externally) */}
      <ChangePasswordDialog
        trigger={null}
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
}
