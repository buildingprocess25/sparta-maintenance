import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function FinishedReportsLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Riwayat Selesai"
                description="Memuat laporan yang sudah selesai dikerjakan..."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="h-10 w-full md:max-w-sm rounded-md bg-muted animate-pulse" />
                </div>

                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="shadow-sm">
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-2">
                                            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                                            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                        </div>
                                        <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-36 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="mt-3 pt-3 border-t flex justify-end">
                                        <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse ml-auto" />
                        <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                    </div>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="space-y-1.5 w-44">
                                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-20 rounded bg-muted animate-pulse ml-auto" />
                            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
