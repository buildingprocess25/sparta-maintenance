"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Bell, KeyRound, LogOut } from "lucide-react";

import { logoutAction } from "@/app/dashboard/action";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { AuthUser } from "@/lib/authorization";

function getInitials(name: string, email: string) {
    const source = name.trim() || email.trim();
    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase() || "U";
}

export function SiteHeaderActions({
    children,
    user,
}: {
    children?: ReactNode;
    user: AuthUser;
}) {
    const [isPending, startTransition] = useTransition();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const pathname = usePathname();
    const initials = getInitials(user.name, user.email);
    const hasHeaderActions = Boolean(children);
    const isDashboardHome = pathname === "/dashboard";

    return (
        <>
            <div className="flex items-center gap-3">
                {hasHeaderActions ? (
                    <>
                        <div className="flex items-center gap-2">
                            {children}
                        </div>
                        <Separator
                            orientation="vertical"
                            className={
                                isDashboardHome
                                    ? "h-4 self-auto!"
                                    : "hidden h-4 self-auto! md:block"
                            }
                        />
                    </>
                ) : null}

                <div
                    className={
                        isDashboardHome
                            ? "flex items-center gap-3"
                            : "hidden items-center gap-3 md:flex"
                    }
                >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="rounded-full"
                                    aria-label="Notifikasi"
                                >
                                    <Bell />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-56"
                            >
                                <DropdownMenuLabel>
                                    Notifikasi
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem disabled>
                                        Sedang dalam pengembangan
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="rounded-full"
                                    disabled={isPending}
                                    aria-label="Menu profil"
                                >
                                    <Avatar>
                                        <AvatarFallback>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-56"
                            >
                                <DropdownMenuLabel>
                                    <span className="block truncate font-medium text-foreground">
                                        {user.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setIsChangePasswordOpen(true);
                                        }}
                                    >
                                        <KeyRound />
                                        Ganti Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        variant="destructive"
                                        disabled={isPending}
                                        onClick={() => {
                                            startTransition(async () => {
                                                await logoutAction();
                                            });
                                        }}
                                    >
                                        <LogOut />
                                        {isPending
                                            ? "Logging out..."
                                            : "Logout"}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                </div>
            </div>
            <ChangePasswordDialog
                open={isChangePasswordOpen}
                onOpenChange={setIsChangePasswordOpen}
                trigger={null}
            />
        </>
    );
}
