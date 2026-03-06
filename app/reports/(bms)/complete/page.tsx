import { requireRole } from "@/lib/authorization";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getWorkableReports } from "./queries";
import { CompleteForm } from "./complete-form";

interface Props {
    searchParams: Promise<{ report?: string }>;
}

export default async function CompletionPage({ searchParams }: Props) {
    const user = await requireRole("BMS");
    const { report: prefillReport } = await searchParams;
    const workableReports = await getWorkableReports(user.NIK);

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
            <main className="flex-1 container max-w-4xl mx-auto px-4 py-10">
                <CompleteForm
                    workableReports={workableReports}
                    userNIK={user.NIK}
                    userName={user.name}
                    prefillReport={prefillReport}
                />
            </main>
            <Footer />
        </div>
    );
}
