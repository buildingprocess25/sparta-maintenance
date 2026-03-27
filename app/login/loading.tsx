import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginLoading() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                variant="dashboard"
                title="Kembali"
                description=""
                showBackButton
                backHref="/"
            />

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg ring-0 shadow-[0_0_0_0]">
                    <CardHeader className="space-y-3">
                        <div className="h-9 w-32 rounded bg-muted animate-pulse" />
                        <div className="h-5 w-72 rounded bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                        </div>

                        <div className="h-11 w-full rounded-md bg-muted animate-pulse" />

                        <div className="relative py-1">
                            <div className="h-px w-full bg-border" />
                        </div>

                        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
