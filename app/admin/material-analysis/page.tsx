import { Metadata } from "next";
import MaterialAnalysisClient from "./client";
import { requireAuth } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { AdminDashboardShell } from "@/app/dashboard/_components/admin/admin-dashboard-shell";
import { getAvailableBranches } from "./actions";

export const metadata: Metadata = {
    title: "Analisa Material | SPARTA-M",
    description: "Analisa Material Realisasi SPARTA Maintenance",
};

export default async function MaterialAnalysisPage() {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const branches = await getAvailableBranches();

    return (
        <AdminDashboardShell
            user={user}
            title="Analisa Material"
            breadcrumbs={[{ label: "Analisa Material" }]}
            contentClassName="space-y-4"
        >
            <div className="mb-4">
                <p className="text-muted-foreground">
                    Lihat dan ekspor data realisasi material terhadap item rusak dari laporan yang telah selesai.
                </p>
            </div>
            
            <MaterialAnalysisClient initialBranches={branches} />
        </AdminDashboardShell>
    );
}
