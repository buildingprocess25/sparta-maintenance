import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Laporan Saya"
                description="Kelola dan pantau status laporan kerusakan"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar Skeleton: Search + Filter + Button */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-1 gap-2">
                        <div className="relative flex-1 md:max-w-sm">
                            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                        </div>
                        <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
                    </div>
                    <div className="h-10 w-full md:w-32 rounded-md bg-muted animate-pulse" />
                </div>

                {/* Mobile View: Card Skeletons */}
                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="shadow-sm">
                            <CardContent>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="h-6 w-28 rounded-full bg-muted animate-pulse" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="mt-3 pt-3 border-t flex justify-end">
                                    <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View: Table Skeleton */}
                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                    {/* Table Header */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-[100px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[200px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[80px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[80px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[80px] rounded bg-muted animate-pulse ml-auto" />
                        <div className="h-4 w-[50px] rounded bg-muted animate-pulse" />
                    </div>
                    {/* Table Rows */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-[100px] rounded bg-muted animate-pulse" />
                            <div className="space-y-1.5 w-[200px]">
                                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-4 w-[80px] rounded bg-muted animate-pulse" />
                            <div className="h-6 w-[100px] rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-[80px] rounded bg-muted animate-pulse ml-auto" />
                            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
