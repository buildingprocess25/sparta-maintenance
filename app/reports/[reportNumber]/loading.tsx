import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportDetailLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title="Detail Laporan"
                description="Memuat data laporan..."
                showBackButton
                backHref="/reports"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-8 space-y-6">
                <div className="h-16 w-full rounded-xl bg-muted animate-pulse" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-4 w-full rounded bg-muted animate-pulse"
                                    />
                                ))}
                                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                        <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />

                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-60 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-16 w-full rounded-lg bg-muted animate-pulse"
                                    />
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
