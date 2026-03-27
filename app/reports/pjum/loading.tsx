import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function PjumLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="PJUM"
                description="Memuat data PJUM..."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6 pb-24 lg:pb-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap flex-1">
                        <div className="h-10 w-full sm:w-44 rounded-md bg-muted animate-pulse" />
                        <div className="h-10 w-full sm:w-44 rounded-md bg-muted animate-pulse" />
                        <div className="h-10 w-full sm:w-44 rounded-md bg-muted animate-pulse" />
                        <div className="h-10 w-full sm:w-32 rounded-md bg-muted animate-pulse" />
                    </div>
                    <div className="h-10 w-full md:w-40 rounded-md bg-muted animate-pulse" />
                </div>

                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="shadow-sm">
                            <CardContent>
                                <div className="space-y-2.5">
                                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                                    <div className="h-5 w-36 rounded-full bg-muted animate-pulse" />
                                    <div className="h-3 w-44 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                    </div>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
