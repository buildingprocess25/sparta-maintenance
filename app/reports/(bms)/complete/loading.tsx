import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CompletionLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Penyelesaian Pekerjaan"
                description="Dokumentasikan penyelesaian pekerjaan dengan foto dan realisasi biaya"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container max-w-4xl mx-auto px-4 py-10 space-y-6">
                <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                    <CardHeader className="px-1 md:px-6 flex flex-row items-center justify-between">
                        <div className="space-y-2">
                            <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                            <div className="h-3 w-36 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                    </CardHeader>
                </Card>

                {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="h-5 w-56 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                            <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="h-10 rounded-md bg-muted animate-pulse" />
                                <div className="h-10 rounded-md bg-muted animate-pulse" />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-72 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
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
