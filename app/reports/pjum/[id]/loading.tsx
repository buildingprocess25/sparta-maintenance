import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PjumDetailLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Detail PJUM"
                description="Memuat detail pertanggungjawaban..."
                showBackButton
                backHref="/reports/pjum"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="h-6 w-48 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-64 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-16 rounded-lg bg-muted animate-pulse"
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-20 rounded-lg bg-muted animate-pulse"
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="h-6 w-40 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-10 w-full rounded bg-muted animate-pulse"
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="h-6 w-36 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-56 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                                <div className="h-20 w-full rounded-md bg-muted animate-pulse" />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="h-11 rounded-md bg-muted animate-pulse" />
                            <div className="h-11 rounded-md bg-muted animate-pulse" />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
