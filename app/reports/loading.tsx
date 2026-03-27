import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Laporan"
                description="Memuat daftar laporan..."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                    <div className="flex flex-col gap-2 md:flex-row md:flex-1 md:flex-wrap">
                        <div className="h-10 w-full md:flex-1 md:min-w-48 md:max-w-sm rounded-md bg-muted animate-pulse" />
                        <div className="h-10 w-full md:w-40 rounded-md bg-muted animate-pulse" />
                        <div className="h-10 w-full md:w-40 rounded-md bg-muted animate-pulse" />
                    </div>
                    <div className="h-10 w-full md:w-36 rounded-md bg-muted animate-pulse" />
                </div>

                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="shadow-sm">
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-2">
                                            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                        </div>
                                        <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="pt-3 border-t flex justify-end">
                                        <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-16 rounded bg-muted animate-pulse ml-auto" />
                    </div>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="space-y-1.5 w-44">
                                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-6 w-40 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="h-8 w-16 rounded-md bg-muted animate-pulse ml-auto" />
                        </div>
                    ))}
                </div>

                <div className="h-9 w-64 mx-auto rounded bg-muted animate-pulse" />
            </main>

            <Footer />
        </div>
    );
}
