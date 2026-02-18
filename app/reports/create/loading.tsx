import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateReportLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Checklist Perbaikan Toko"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl space-y-6">
                {/* Step Indicator Skeleton */}
                <div className="flex items-center justify-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    <div className="h-1 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                </div>

                {/* Store Card Skeleton */}
                <Card>
                    <CardContent className="space-y-4 p-6">
                        <div className="space-y-2">
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                        </div>
                    </CardContent>
                </Card>

                {/* Checklist Category Skeletons */}
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-5 w-5 rounded bg-muted animate-pulse shrink-0" />
                            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
                            <div className="h-5 w-5 rounded bg-muted animate-pulse ml-auto" />
                        </CardContent>
                    </Card>
                ))}

                {/* Submit Button Skeleton */}
                <div className="h-11 w-full rounded-md bg-muted animate-pulse" />
            </main>

            <Footer />
        </div>
    );
}
