import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BmcDatabaseLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen BMS & Toko"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-5xl space-y-5">
                {/* Branch badge skeleton */}
                <div className="flex items-center gap-2">
                    <div className="h-5 w-14 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                </div>

                {/* Tabs skeleton */}
                <div className="flex gap-2">
                    <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
                    <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
                </div>

                {/* Table skeleton */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-32 rounded bg-muted animate-pulse hidden sm:block" />
                                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
