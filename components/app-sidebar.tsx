"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/authorization";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    IconDashboard,
    IconReport,
    IconFileDescription,
    IconUsers,
    IconBuildingStore,
    IconArchive,
    IconSettings,
    IconSquareCheck,
    IconBuildingCommunity,
    IconUserCog,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronRight, IconKey, IconLogout } from "@tabler/icons-react";
import { logoutAction } from "@/app/dashboard/action";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const data = {
    user: {
        name: "Akmal Zaidan",
        email: "akmal@example.com",
        initials: "AZ",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: IconDashboard,
        },
    ],
    navGroups: [
        {
            title: "Rekapan",
            items: [
                {
                    title: "Laporan Maintenance",
                    url: "/dashboard/reports",
                    icon: IconReport,
                },
                {
                    title: "Checklist Preventif",
                    url: "/dashboard/preventive",
                    icon: IconSquareCheck,
                },
                {
                    title: "Dokumen PJUM",
                    url: "/dashboard/pjum",
                    icon: IconFileDescription,
                },
            ],
        },
        {
            title: "Monitoring",
            items: [
                {
                    title: "Performa Cabang",
                    url: "/dashboard/branches",
                    icon: IconBuildingCommunity,
                },
                {
                    title: "Performa BMS",
                    url: "/dashboard/bms-performance",
                    icon: IconUserCog,
                },
                {
                    title: "Aktivitas User",
                    url: "/dashboard/activity",
                    icon: IconUsers,
                },
            ],
        },
        {
            title: "Master Data",
            items: [
                {
                    title: "User",
                    url: "/dashboard/users",
                    icon: IconUsers,
                },
                {
                    title: "Toko",
                    url: "/dashboard/stores",
                    icon: IconBuildingStore,
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Arsip Dokumen SPARTA-M",
            url: "/admin/archive",
            icon: IconArchive,
        },
        {
            title: "Pengaturan Sistem",
            url: "/dashboard/settings",
            icon: IconSettings,
        },
    ],
};

const DASHBOARD_PARENT_ROUTES = ["/dashboard/realisasi"];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    user?: AuthUser;
};

export function AppSidebar({
    user: authUser,
    variant = "sidebar",
    ...props
}: AppSidebarProps) {
    const { isMobile } = useSidebar();
    const [isPending, startTransition] = React.useTransition();
    const [isChangePasswordOpen, setIsChangePasswordOpen] =
        React.useState(false);
    const displayUser = authUser
        ? {
              name: authUser.name,
              email: authUser.email,
              initials: authUser.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join(""),
          }
        : data.user;

    const pathname = usePathname();

    const isItemActive = (url: string) => {
        if (url === "#") return false;
        if (url === "/dashboard") {
            return (
                pathname === "/dashboard" ||
                DASHBOARD_PARENT_ROUTES.some(
                    (route) =>
                        pathname === route || pathname.startsWith(`${route}/`),
                )
            );
        }
        return pathname.startsWith(url);
    };

    const shouldShowItem = (title: string) => {
        if (!authUser) return true;

        if (authUser.role === "ADMIN") {
            return title !== "Performa BMS";
        }

        if (authUser.role === "BMC" || authUser.role === "BNM_MANAGER") {
            const baseItems = [
                "Laporan Maintenance",
                "Checklist Preventif",
                "Dokumen PJUM",
                "Performa BMS",
            ];

            if (authUser.role === "BMC") {
                baseItems.push("Aktivitas User", "User", "Toko");
            }

            return baseItems.includes(title);
        }

        return false;
    };

    const shouldShowSecondaryItem = () => {
        return authUser?.role === "ADMIN";
    };

    return (
        <Sidebar collapsible="offcanvas" variant={variant} {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className={cn("flex w-full justify-center")}>
                            {/* Logo Container with Glass Effect */}
                            <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-1.5 backdrop-blur-sm md:gap-4 md:px-4 md:py-2">
                                <Image
                                    src="/assets/Alfamart-Emblem.png"
                                    alt="Alfamart"
                                    width={120}
                                    height={120}
                                    className="h-6 w-auto md:h-8 object-contain drop-shadow-md"
                                    priority
                                />

                                <div className="h-4 md:h-5 w-px bg-white/20 rounded-full" />

                                <div className="flex items-center gap-2">
                                    <Image
                                        src="/assets/Building-Logo.png"
                                        alt="SPARTA Logo"
                                        width={60}
                                        height={60}
                                        className="h-6 w-auto md:h-8 object-contain drop-shadow-md"
                                        priority
                                    />
                                    <div className="flex flex-col items-end leading-none text-white">
                                        <span className="font-bold text-sm tracking-wider">
                                            SPARTA
                                        </span>
                                        <span className="text-[10px] opacity-80 font-light">
                                            Maintenance
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {data.navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    className="hover:bg-white/10"
                                    isActive={isItemActive(item.url)}
                                >
                                    <Link
                                        href={item.url}
                                        target={
                                            item.url.startsWith("http")
                                                ? "_blank"
                                                : undefined
                                        }
                                        rel={
                                            item.url.startsWith("http")
                                                ? "noopener noreferrer"
                                                : undefined
                                        }
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                {data.navGroups.map((group) => {
                    const visibleItems = group.items.filter((item) =>
                        shouldShowItem(item.title),
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="text-white/70">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {visibleItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.title}
                                                className="hover:bg-white/10"
                                                isActive={isItemActive(
                                                    item.url,
                                                )}
                                            >
                                                <Link
                                                    href={item.url}
                                                    target={
                                                        item.url.startsWith(
                                                            "http",
                                                        )
                                                            ? "_blank"
                                                            : undefined
                                                    }
                                                    rel={
                                                        item.url.startsWith(
                                                            "http",
                                                        )
                                                            ? "noopener noreferrer"
                                                            : undefined
                                                    }
                                                >
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}

                {data.navSecondary.some(shouldShowSecondaryItem) ? (
                    <SidebarGroup className="mt-auto">
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {data.navSecondary.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            className="hover:bg-white/10"
                                            isActive={isItemActive(item.url)}
                                        >
                                            <Link
                                                href={item.url}
                                                target={
                                                    item.url.startsWith("http")
                                                        ? "_blank"
                                                        : undefined
                                                }
                                                rel={
                                                    item.url.startsWith("http")
                                                        ? "noopener noreferrer"
                                                        : undefined
                                                }
                                            >
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ) : null}
            </SidebarContent>

            <SidebarFooter className="relative z-10">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    id="admin-sidebar-profile-trigger"
                                    size="lg"
                                    className="group/profile-trigger shadow-[0_12px_28px_-24px_var(--sidebar-foreground)] ring-sidebar-border/60 backdrop-blur transition-all hover:bg-sidebar-accent/70 hover:shadow-[0_14px_34px_-24px_var(--primary)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                                    disabled={isPending}
                                >
                                    <Avatar>
                                        <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                                            {displayUser.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="grid flex-1 text-left text-sm leading-tight text-white group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-medium">
                                            {displayUser.name}
                                        </span>
                                        {displayUser.email && (
                                            <span className="truncate text-xs text-white/70">
                                                {displayUser.email}
                                            </span>
                                        )}
                                    </span>
                                    <IconChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/profile-trigger:rotate-90 group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side={isMobile ? "top" : "right"}
                                align="end"
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel>
                                    <span className="block truncate font-medium text-foreground">
                                        {displayUser.name}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {displayUser.email}
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
                                        <IconKey />
                                        Ganti Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            startTransition(async () => {
                                                await logoutAction();
                                            });
                                        }}
                                        variant="destructive"
                                        disabled={isPending}
                                    >
                                        <IconLogout />
                                        <span>
                                            {isPending
                                                ? "Logging out..."
                                                : "Logout"}
                                        </span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
                <ChangePasswordDialog
                    open={isChangePasswordOpen}
                    onOpenChange={setIsChangePasswordOpen}
                    trigger={null}
                />
            </SidebarFooter>
        </Sidebar>
    );
}
