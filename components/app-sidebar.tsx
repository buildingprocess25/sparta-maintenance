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
    IconListDetails,
    IconFileDescription,
    IconUsers,
    IconBuildingStore,
    IconArchive,
    IconSettings,
    IconSquareCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, LogOut } from "lucide-react";
import { logoutAction } from "@/app/dashboard/action";

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
                    title: "List Material",
                    url: "/dashboard/materials",
                    icon: IconListDetails,
                },
                {
                    title: "PJUM",
                    url: "/dashboard/pjum",
                    icon: IconFileDescription,
                },
                {
                    title: "Checklist Preventif",
                    url: "/dashboard/preventive",
                    icon: IconSquareCheck,
                },
            ],
        },
        {
            title: "Management Database",
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
            url: "https://drive.google.com/drive/folders/1n66NgqwyewwRghAMRU6LVPs3W1dTIlmj",
            icon: IconArchive,
        },
        {
            title: "Pengaturan Sistem",
            url: "/dashboard/settings",
            icon: IconSettings,
        },
    ],
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    user?: AuthUser;
};

export function AppSidebar({ user: authUser, ...props }: AppSidebarProps) {
    const { isMobile } = useSidebar();
    const [isPending, startTransition] = React.useTransition();
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
        if (url === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(url);
    };

    return (
        <Sidebar collapsible="offcanvas" {...props} variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div
                            className={cn(
                                "items-center gap-3 shrink-0",
                                "flex",
                            )}
                        >
                            {/* Logo Container with Glass Effect */}
                            <div className="flex items-center gap-3 md:gap-4 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-black/10 backdrop-blur-sm border border-white/5">
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

                {data.navGroups.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="text-white/70">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
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
                ))}

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
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="hover:bg-white/10 transition-colors"
                                    disabled={isPending}
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 font-semibold text-white">
                                        {displayUser.initials}
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight text-white">
                                        <span className="truncate font-bold">
                                            {displayUser.name}
                                        </span>
                                        {displayUser.email && (
                                            <span className="truncate text-xs opacity-80">
                                                {displayUser.email}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side={isMobile ? "top" : "right"}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem
                                    onClick={() => {
                                        startTransition(async () => {
                                            await logoutAction();
                                        });
                                    }}
                                    variant="destructive"
                                    disabled={isPending}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>
                                        {isPending
                                            ? "Logging out..."
                                            : "Logout"}
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
