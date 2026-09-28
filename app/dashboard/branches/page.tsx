import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "../_components/admin/admin-trend-filter";
import { AdminBranchesTable } from "./_components/admin-branches-table";
import { getAdminBranchesData, getAdminDetailedSLAData } from "./actions";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSLATable } from "./_components/admin-sla-table";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ period?: string | string[]; brand?: string; tab?: string }>
};

function normalizePeriod(value?: string | string[]) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw && /^\d{2}-\d{4}$/.test(raw)) return raw;
    return "ytd";
}

export default async function AdminBranchesPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)) {
        redirect("/dashboard");
    }

    const params = await searchParams;
    const period = normalizePeriod(params.period);
    const brand = user.role === "ADMIN"
        ? normalizeStoreBrandFilter(params.brand)
        : "ALL";
    const activeTab = params.tab === "sla" ? "sla" : "ringkasan";
        
    const [data, slaData] = await Promise.all([
        getAdminBranchesData(period, brand),
        getAdminDetailedSLAData(period, brand)
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Performa Cabang"
            breadcrumbs={[{ label: "Performa Cabang" }]}
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={period}
                    initialBrand={brand}
                    showBrandFilter={user.role === "ADMIN"}
                    basePath="/dashboard/branches"
                />
            }
            contentClassName="h-full flex flex-col min-h-0 p-0"
        >
            <Tabs defaultValue={activeTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-6 pb-2 border-b">
                    <TabsList>
                        <TabsTrigger value="ringkasan">Ringkasan Operasional</TabsTrigger>
                        <TabsTrigger value="sla">SLA Proses</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="ringkasan" className="flex-1 overflow-y-auto p-6 mt-0">
                    <AdminBranchesTable data={data} brand={brand} />
                </TabsContent>
                
                <TabsContent value="sla" className="flex-1 overflow-y-auto p-6 mt-0">
                    <AdminSLATable data={slaData} />
                </TabsContent>
            </Tabs>
        </AdminDashboardShell>
    );
}
