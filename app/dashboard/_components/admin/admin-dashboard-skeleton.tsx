import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[350px]" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-36" />
                </div>
            </div>

            {/* KPI Grid Skeleton */}
            <div className="grid gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-48">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="mt-2 h-8 w-16" />
                            <Skeleton className="mt-1 h-3 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-2 w-full mt-4 mb-4" />
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Status Distribution Skeleton */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-[300px] w-full" />
            </div>
            
            {/* Chart Skeleton */}
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
}
