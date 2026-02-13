import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Dashboard"
                showBackButton={false}
                backHref="/"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-7xl space-y-8">
                {/* Welcome Section Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                        <div className="h-7 md:h-9 w-64 rounded-md bg-muted animate-pulse" />
                        <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-44 rounded-full bg-muted animate-pulse" />
                        <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
                    </div>
                </div>

                {/* Stats Grid Skeleton — 4 columns */}
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="gap-2 py-3 md:py-6">
                            <CardHeader className="flex flex-row items-center px-0 md:px-6 justify-center md:justify-between space-y-0">
                                <div className="h-4 w-12 md:w-24 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-4 rounded bg-muted animate-pulse hidden md:block" />
                            </CardHeader>
                            <CardContent className="md:items-start justify-center items-center gap-1 flex md:flex-col">
                                <div className="h-6 md:h-8 w-8 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-3 rounded bg-muted animate-pulse md:hidden" />
                                <div className="h-3 w-20 rounded bg-muted animate-pulse hidden md:block mt-1" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Grid: Menu (2 col) + Activity (1 col) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Menu Section */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="h-full">
                                    <CardContent className="p-5 py-0 flex flex-row items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-muted animate-pulse shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-5 w-36 rounded bg-muted animate-pulse" />
                                            <div className="h-3 w-full rounded bg-muted animate-pulse" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        </div>
                        <Card className="h-fit">
                            <CardContent className="p-0">
                                <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-50">
                                    <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-44 rounded bg-muted animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
