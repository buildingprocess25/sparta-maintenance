import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminAhoTicketsTable } from "./_components/admin-aho-tickets-table";
import { ImportAhoTicketsDialog } from "./_components/import-aho-tickets-dialog";
import { getAdminAhoTickets } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAhoTicketsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    
    // Sesuai spec, menu ini hanya untuk role ADMIN
    if (user.role !== "ADMIN") redirect("/dashboard");

    const initialData = await getAdminAhoTickets(null, 20, {});

    return (
        <AdminDashboardShell
            user={user}
            title="Master Tiket AHO"
            breadcrumbs={[{ label: "Master Data" }, { label: "Tiket AHO" }]}
            headerActions={<ImportAhoTicketsDialog />}
            contentClassName="h-full"
        >
            <AdminAhoTicketsTable
                initialData={initialData.tickets}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
            />
        </AdminDashboardShell>
    );
}
