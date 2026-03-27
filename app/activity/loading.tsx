import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function ActivityLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Semua Aktivitas"
                description="Memuat aktivitas..."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="h-10 w-full md:max-w-sm rounded-md bg-muted animate-pulse" />
                    <div className="h-10 w-full md:w-44 rounded-md bg-muted animate-pulse" />
                </div>

                <div className="space-y-3 md:hidden">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="bg-card border rounded-lg shadow-sm p-4 space-y-3"
                        >
                            <div className="space-y-2">
                                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-5 w-36 rounded-full bg-muted animate-pulse" />
                            <div className="flex items-center justify-between">
                                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                    </div>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0"
                        >
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="space-y-1.5 w-40">
                                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-5 w-36 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="h-7 w-14 rounded-md bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>

                <div className="h-9 w-64 mx-auto rounded bg-muted animate-pulse" />
            </main>

            <Footer />
        </div>
    );
}
