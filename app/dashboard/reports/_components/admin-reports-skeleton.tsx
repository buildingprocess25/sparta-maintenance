import { Skeleton } from "@/components/ui/skeleton";

export function AdminReportsSkeleton() {
    return (
        <div className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
            <div className="border rounded-md">
                <div className="h-12 border-b bg-muted/50" />
                <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
