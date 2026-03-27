import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Dashboard"
                showBackButton={false}
                backHref="/"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl space-y-6 md:space-y-8">
                <div className="md:rounded-xl md:border-l-4 md:border-l-primary md:border md:border-border md:bg-card md:shadow-sm">
                    <div className="flex-1 md:px-6 md:py-5">
                        <div className="md:hidden space-y-3">
                            <div className="h-6 w-44 rounded bg-muted animate-pulse" />
                            <div className="h-5 w-56 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                        </div>

                        <div className="hidden md:flex md:items-center justify-between gap-4">
                            <div className="space-y-3">
                                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                                <div className="h-8 w-64 rounded bg-muted animate-pulse" />
                                <div className="h-5 w-80 rounded-full bg-muted animate-pulse" />
                            </div>
                            <div className="flex items-center gap-5 shrink-0">
                                <div className="h-12 w-28 rounded bg-muted animate-pulse" />
                                <div className="w-px h-10 bg-border" />
                                <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 lg:gap-6 items-start">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 shrink-0">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-14 rounded-md bg-muted animate-pulse"
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl overflow-hidden border shadow-sm flex flex-col lg:flex-row bg-card">
                            <div className="lg:w-52 p-4 lg:p-5 bg-muted/50 space-y-4">
                                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                                <div className="h-12 w-20 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 bg-card">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="p-4 space-y-3">
                                        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                                        <div className="h-8 w-12 rounded bg-muted animate-pulse" />
                                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Card className="rounded-xl overflow-hidden border shadow-sm">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                    <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                                </div>
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
                                    >
                                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                                        <div className="h-5 w-32 rounded-full bg-muted animate-pulse" />
                                        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-24 rounded bg-muted animate-pulse ml-auto" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
