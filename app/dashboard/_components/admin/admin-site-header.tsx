import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader({
    title = "Dashboard",
    children,
}: {
    title?: string;
    children?: React.ReactNode;
}) {
    return (
        <header className="flex h-15 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="h-4 self-auto!"
                    />
                    <h1 className="text-base font-medium">{title}</h1>
                </div>
                {children && (
                    <div className="flex items-center gap-2">{children}</div>
                )}
            </div>
        </header>
    );
}
