import { Card, CardContent } from "@/components/ui/card";
import {
    ClipboardCheck,
    FolderOpen,
    Settings as SettingsIcon,
    Settings,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getGlobalActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySection } from "./shared/activity-feed";
import type { AuthUser } from "@/lib/authorization";

const MENUS = [
    {
        title: "Verifikasi Dokumen",
        description: "Cek nota dan kelengkapan dokumen",
        icon: ClipboardCheck,
        href: "/admin/verification",
        variant: "default" as const,
    },
    {
        title: "Arsip Dokumen",
        description: "Kelola arsip dan dokumen",
        icon: FolderOpen,
        href: "/admin/archive",
        variant: "outline" as const,
    },
    {
        title: "Pengaturan",
        description: "Pengaturan sistem dan user",
        icon: SettingsIcon,
        href: "/admin/settings",
        variant: "outline" as const,
    },
];

export async function AdminDashboard({ user }: { user: AuthUser }) {
    const activities = await getGlobalActivity(10);
    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Menu */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Menu Utama
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MENUS.map((menu, index) => {
                            const Icon = menu.icon;
                            const isDefault = menu.variant === "default";
                            return (
                                <Link
                                    key={index}
                                    href={menu.href}
                                    className="group block h-full"
                                >
                                    <Card
                                        className={`h-full transition-all duration-200 ${
                                            isDefault
                                                ? "bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg hover:bg-primary/90"
                                                : "hover:border-primary/50 hover:shadow-md hover:bg-accent/5"
                                        }`}
                                    >
                                        <CardContent className="p-5 py-0 flex flex-row items-start gap-4">
                                            <div
                                                className={`p-3 rounded-xl shrink-0 transition-colors ${
                                                    isDefault
                                                        ? "bg-white/10"
                                                        : "bg-primary/10 group-hover:bg-primary/20"
                                                }`}
                                            >
                                                <Icon
                                                    className={`h-6 w-6 ${isDefault ? "text-white" : "text-primary"}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <h3
                                                    className={`font-semibold text:sm md:text-lg ${isDefault ? "text-white" : "text-foreground"}`}
                                                >
                                                    {menu.title}
                                                </h3>
                                                <p
                                                    className={`text-xs md:text-sm leading-relaxed ${isDefault ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                                                >
                                                    {menu.description}
                                                </p>
                                            </div>
                                            {isDefault && (
                                                <ArrowRight className="h-5 w-5 ml-auto self-center text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Activity Feed */}
                <ActivitySection activities={activities} />
            </div>
        </DashboardShell>
    );
}
