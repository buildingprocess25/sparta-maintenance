import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Admin"
                description="Memuat halaman admin"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl space-y-6">
                <div className="h-6 w-64 rounded bg-muted animate-pulse" />
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <div className="h-6 w-56 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-72 rounded bg-muted animate-pulse mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-24 rounded-lg bg-muted/70 animate-pulse" />
                            <div className="h-24 rounded-lg bg-muted/70 animate-pulse" />
                            <div className="h-24 rounded-lg bg-muted/70 animate-pulse" />
                            <div className="h-24 rounded-lg bg-muted/70 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
