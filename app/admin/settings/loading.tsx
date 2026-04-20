import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Pengaturan Sistem"
                description="Konfigurasi sistem, maintenance, dan fungsi lanjutan."
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-3xl space-y-6">
                <Skeleton className="h-10 w-48 rounded" />

                <div className="space-y-6 mt-4">
                    <Skeleton className="h-[250px] w-full rounded-xl" />
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>
            </main>

            <Footer />
        </div>
    );
}
