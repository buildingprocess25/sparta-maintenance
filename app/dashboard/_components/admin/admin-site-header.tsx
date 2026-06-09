import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { AuthUser } from "@/lib/authorization";
import { SiteHeaderActions } from "./admin-site-header-actions";

export type BreadcrumbEntry = {
    label: string;
    href?: string;
};

export function SiteHeader({
    title = "Dashboard",
    breadcrumbs,
    children,
    user,
}: {
    title?: string;
    breadcrumbs?: BreadcrumbEntry[];
    children?: ReactNode;
    user: AuthUser;
}) {
    return (
        <header className="sticky top-0 z-50 flex h-15 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="h-4 self-auto!"
                    />
                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <Breadcrumb>
                            {breadcrumbs.length > 1 ? (
                                <BreadcrumbList className="md:hidden">
                                    <BreadcrumbItem>
                                        <BreadcrumbEllipsis />
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>
                                            {
                                                breadcrumbs[
                                                    breadcrumbs.length - 1
                                                ].label
                                            }
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            ) : null}
                            <BreadcrumbList
                                className={
                                    breadcrumbs.length > 1
                                        ? "hidden md:flex"
                                        : undefined
                                }
                            >
                                {breadcrumbs.map((crumb, index) => {
                                    const isLast =
                                        index === breadcrumbs.length - 1;
                                    return (
                                        <Fragment key={crumb.label}>
                                            <BreadcrumbItem>
                                                {isLast ? (
                                                    <BreadcrumbPage>
                                                        {crumb.label}
                                                    </BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink asChild>
                                                        <Link
                                                            href={
                                                                crumb.href ??
                                                                "#"
                                                            }
                                                        >
                                                            {crumb.label}
                                                        </Link>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast && <BreadcrumbSeparator />}
                                        </Fragment>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    ) : (
                        <h1 className="text-base font-medium">{title}</h1>
                    )}
                </div>
                <SiteHeaderActions user={user}>{children}</SiteHeaderActions>
            </div>
        </header>
    );
}
