import { requireRole } from "@/lib/authorization";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { fetchAllBranchNames } from "./queries";
import { ExportForm } from "./_components/export-form";
import { FileSpreadsheet } from "lucide-react";

export const metadata = {
    title: "Export Data XLSX — SPARTA Maintenance",
    description: "Unduh data laporan, material, dan PJUM dalam format Excel",
};

export default async function AdminExportPage() {
    await requireRole("ADMIN");

    const branchNames = await fetchAllBranchNames();

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header
                variant="dashboard"
                title="Export Data"
                description="Unduh data ke format Excel (.xlsx)"
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Export Data XLSX</h1>
                        <p className="text-sm text-muted-foreground">
                            Tarikan data laporan, material, dan PJUM ke file Excel
                        </p>
                    </div>
                </div>

                <ExportForm branchNames={branchNames} />
            </main>

            <Footer />
        </div>
    );
}
