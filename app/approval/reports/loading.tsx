import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function ApprovalLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Approval Laporan"
                description="Persetujuan laporan maintenance dari BMS"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Control Bar: Tabs + Search */}
                <div className="flex flex-col md:flex-row justify-between gap-4 items-end md:items-center">
                    {/* Tab Bar Skeleton */}
                    <div className="w-full md:w-[400px] h-10 rounded-lg bg-muted animate-pulse" />
                    {/* Search Skeleton */}
                    <div className="w-full md:w-72 h-10 rounded-md bg-muted animate-pulse" />
                </div>

                {/* Mobile View: Card Skeletons */}
                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="shadow-sm">
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-3 w-52 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="pt-3 border-t flex justify-end">
                                    <div className="h-8 w-28 rounded-md bg-muted animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View: Table Skeleton */}
                <div className="hidden md:block bg-card border rounded-lg shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-[140px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[200px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[160px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[80px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[100px] rounded bg-muted animate-pulse" />
                        <div className="h-4 w-[50px] rounded bg-muted animate-pulse ml-auto" />
                    </div>
                    {/* Table Rows */}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-[140px] rounded bg-muted animate-pulse" />
                            <div className="space-y-1.5 w-[200px]">
                                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-3 w-[160px] rounded bg-muted animate-pulse" />
                            <div className="h-4 w-[80px] rounded bg-muted animate-pulse" />
                            <div className="h-4 w-[100px] rounded bg-muted animate-pulse" />
                            <div className="h-8 w-8 rounded bg-muted animate-pulse ml-auto" />
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
