import { requireRole } from "@/lib/authorization";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getStartableReports } from "./queries";
import { StartWorkForm } from "./start-work-form";

interface Props {
    searchParams: Promise<{ report?: string }>;
}

export default async function StartWorkPage({ searchParams }: Props) {
    const user = await requireRole("BMS");
    const { report: prefillReport } = await searchParams;
    const startableReports = await getStartableReports(user.NIK);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Mulai Pengerjaan"
                description="Upload foto selfie dan nota sebelum memulai pengerjaan laporan"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />
            <main className="flex-1 container max-w-4xl mx-auto px-4 py-10">
                <StartWorkForm
                    startableReports={startableReports}
                    userNIK={user.NIK}
                    userName={user.name}
                    prefillReport={prefillReport}
                />
            </main>
            <Footer />
        </div>
    );
}
