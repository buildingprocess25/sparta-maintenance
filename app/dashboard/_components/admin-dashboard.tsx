import {
    ClipboardCheck,
    FolderOpen,
    SettingsIcon,
} from "lucide-react";
import { getGlobalActivity } from "../queries";
import { DashboardShell } from "./shared/dashboard-shell";
import { ActivitySectionWide } from "./shared/activity-feed";
import { DashboardMenus, type DashboardMenuItem } from "./shared/dashboard-menus";
import type { AuthUser } from "@/lib/authorization";

const MENUS: DashboardMenuItem[] = [
    {
        title: "Verifikasi Dokumen",
        description: "Cek nota dan kelengkapan dokumen",
        icon: ClipboardCheck,
        href: "/admin/verification",
        variant: "default",
    },
    {
        title: "Arsip Dokumen",
        description: "Kelola arsip dan dokumen",
        icon: FolderOpen,
        href: "/admin/archive",
        variant: "outline",
    },
    {
        title: "Pengaturan",
        description: "Pengaturan sistem dan user",
        icon: SettingsIcon,
        href: "/admin/settings",
        variant: "outline",
    },
];

export async function AdminDashboard({ user }: { user: AuthUser }) {
    const activities = await getGlobalActivity(10);
    return (
        <DashboardShell user={user}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                {/* Left column: Menu (1/4) */}
                <DashboardMenus menus={MENUS} />

                {/* Right column: Activity Feed (3/4) */}
                <div className="space-y-4">
                    <ActivitySectionWide activities={activities} />
                </div>
            </div>
        </DashboardShell>
    );
}
