import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function BmsDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            {/* Welcome Card Skeleton */}
            <Card className="border-none bg-primary text-primary-foreground shadow-md">
                <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 bg-primary-foreground/20 mb-2" />
                    <Skeleton className="h-4 w-1/2 bg-primary-foreground/20 mb-6" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
                        <Skeleton className="h-8 w-40 bg-primary-foreground/20" />
                    </div>
                </CardContent>
            </Card>

            {/* Create Report Button Skeleton */}
            <Skeleton className="h-12 w-full rounded-md" />

            {/* Preventive Card Skeleton */}
            <Card>
                <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex flex-col gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-4 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Activity List Skeleton */}
            <section className="flex flex-col gap-3 mt-4">
                <div className="flex items-end justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </section>
        </div>
    );
}
