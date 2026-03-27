import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function UserManualLoading() {
    return (
        <div className="min-h-screen bg-background">
            <Header
                variant="dashboard"
                title="User Manual"
                description="Panduan Lengkap SPARTA Maintenance"
                showBackButton
                backHref="/"
            />

            <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
                <div className="space-y-3">
                    <div className="h-9 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                </div>

                <Card className="border-2">
                    <CardHeader className="space-y-3">
                        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="space-y-2">
                                <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
                                <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader className="space-y-3">
                        <div className="h-6 w-36 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 7 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="p-3 rounded-lg border bg-muted/40 space-y-2"
                                >
                                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-full rounded bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="h-8 w-56 rounded bg-muted animate-pulse" />
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="border-2">
                            <CardHeader className="space-y-2">
                                <div className="h-6 w-64 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Array.from({ length: 3 }).map((__, row) => (
                                    <div key={row} className="space-y-2">
                                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                                        <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
