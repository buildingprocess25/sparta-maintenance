import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/authorization";
import { SiteHeader, type BreadcrumbEntry } from "./admin-site-header";

type AdminDashboardShellProps = {
    user: AuthUser;
    title: string;
    children: ReactNode;
    headerActions?: ReactNode;
    contentClassName?: string;
    breadcrumbs?: BreadcrumbEntry[];
};

export function AdminDashboardShell({
    user,
    title,
    children,
    headerActions,
    contentClassName,
    breadcrumbs,
}: AdminDashboardShellProps) {
    return (
        <SidebarProvider>
            <AppSidebar variant="sidebar" user={user} />
            <SidebarInset className="min-w-0 max-w-full">
                <SiteHeader title={title} breadcrumbs={breadcrumbs}>
                    {headerActions}
                </SiteHeader>
                <div
                    className={cn(
                        "flex min-w-0 max-w-full flex-col gap-6 p-4 lg:p-6",
                        contentClassName,
                    )}
                >
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
