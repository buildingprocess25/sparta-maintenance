import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminExportLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Export Data"
                description="Unduh data ke format Excel (.xlsx)"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-4xl space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="h-5 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                                    <div className="h-9 rounded-md bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-5 w-56 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-72 rounded bg-muted animate-pulse mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-16 rounded-lg border bg-muted/30 animate-pulse"
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
                                <div className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
                            </div>
                            <div className="h-px bg-border" />
                            <div className="h-10 w-full sm:w-40 rounded-md bg-primary/20 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
