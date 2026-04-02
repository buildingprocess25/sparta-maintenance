import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BmcDatabaseLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen BMS & Toko"
                description="Data user dan toko cabang"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl space-y-6">
                {/* Branch badge skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground mr-1">Area Anda:</span>
                        <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                    </div>
                </div>

                {/* Tabs skeleton matches bg-primary/10 style */}
                <div className="w-full">
                    <div className="mb-5">
                        <div className="flex w-full items-center p-1 rounded-lg bg-primary/10">
                            <div className="h-9 w-32 sm:w-40 rounded-md bg-background/50 animate-pulse mr-2" />
                            <div className="h-9 w-32 sm:w-40 rounded-md bg-transparent" />
                        </div>
                    </div>

                    {/* Content skeleton */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                            </CardTitle>
                            <CardDescription>
                                <div className="h-4 w-72 bg-muted mt-2 animate-pulse rounded" />
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Table controls skeleton matching Search and Select on table */}
                            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <div className="h-9 w-full sm:w-64 rounded-md bg-muted animate-pulse" />
                                    <div className="h-9 w-full sm:w-40 rounded-md bg-muted animate-pulse" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-32 rounded-md bg-muted hidden lg:block animate-pulse" />
                                    <div className="h-9 w-28 rounded-md bg-primary/20 animate-pulse" />
                                </div>
                            </div>

                            {/* Table skeleton */}
                            <div className="border rounded-md">
                                <div className="h-10 bg-muted/40 border-b animate-pulse" />
                                <div className="space-y-4 p-4">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
                                            <div className="h-4 w-1/4 rounded bg-muted hidden sm:block animate-pulse" />
                                            <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
                                            <div className="h-4 w-1/4 rounded bg-muted text-right animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
