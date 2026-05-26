import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/authorization";
import { SiteHeader } from "./admin-site-header";

type AdminDashboardShellProps = {
    user: AuthUser;
    title: string;
    children: ReactNode;
    headerActions?: ReactNode;
    contentClassName?: string;
};

export function AdminDashboardShell({
    user,
    title,
    children,
    headerActions,
    contentClassName,
}: AdminDashboardShellProps) {
    return (
        <SidebarProvider>
            <AppSidebar variant="sidebar" user={user} />
            <SidebarInset>
                <SiteHeader title={title}>{headerActions}</SiteHeader>
                <div
                    className={cn(
                        "flex flex-col gap-6 p-4 lg:p-6",
                        contentClassName,
                    )}
                >
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
