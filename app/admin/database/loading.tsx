import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminDatabaseLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Manajemen User & Toko (Global)"
                description="Kelola seluruh user dan toko lintas cabang"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl space-y-6">
                <div className="mb-5">
                    <div className="flex w-full items-center p-1 rounded-lg bg-primary/10 gap-2">
                        <div className="h-10 flex-1 rounded-md bg-background/70 animate-pulse" />
                        <div className="h-10 flex-1 rounded-md bg-muted/70 animate-pulse" />
                    </div>
                </div>

                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <div className="h-6 w-52 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-72 rounded bg-muted animate-pulse mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col lg:flex-row gap-3 mb-4">
                            <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
                            <div className="h-9 w-full lg:w-44 rounded-md bg-muted animate-pulse" />
                            <div className="h-9 w-full lg:w-48 rounded-md bg-muted animate-pulse" />
                            <div className="h-9 w-full lg:w-28 rounded-md bg-primary/20 animate-pulse" />
                        </div>

                        <div className="rounded-md border overflow-hidden">
                            <div className="h-10 border-b bg-muted/40 animate-pulse" />
                            <div className="space-y-3 p-4">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-4 gap-3"
                                    >
                                        <div className="h-4 rounded bg-muted animate-pulse" />
                                        <div className="h-4 rounded bg-muted animate-pulse" />
                                        <div className="h-4 rounded bg-muted animate-pulse" />
                                        <div className="h-4 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded border bg-muted/70 animate-pulse" />
                                <div className="h-8 w-8 rounded border bg-muted/70 animate-pulse" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
