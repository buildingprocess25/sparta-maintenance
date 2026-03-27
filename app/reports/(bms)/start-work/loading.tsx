import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StartWorkLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Mulai Pengerjaan"
                description="Upload foto selfie dan nota sebelum memulai pengerjaan laporan"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container max-w-4xl mx-auto px-4 py-10 space-y-6">
                <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-1 md:px-6 space-y-2">
                        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-36 rounded bg-muted animate-pulse" />
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-80 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-32 w-32 rounded-lg bg-muted animate-pulse"
                                />
                            ))}
                        </div>
                        <div className="h-10 w-40 rounded-md bg-muted animate-pulse" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-72 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-32 w-32 rounded-lg bg-muted animate-pulse"
                                />
                            ))}
                        </div>
                        <div className="h-10 w-36 rounded-md bg-muted animate-pulse" />

                        <div className="space-y-3 pt-2 border-t">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 gap-2"
                                >
                                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="h-11 rounded-md bg-muted animate-pulse" />
                    <div className="h-11 rounded-md bg-muted animate-pulse" />
                </div>
            </main>

            <Footer />
        </div>
    );
}
