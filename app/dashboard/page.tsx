import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminNewDashboard } from "./_components/admin/admin-new-dashboard";
import { AdminDashboardV2 } from "./_components/admin/admin-dashboard-v2";
import { getAdminCommandCenterData, getAdminRealisasiDetail } from "./queries";
type DashboardPageProps = {
    searchParams?: Promise<{
        period?: string | string[];
        brand?: string | string[];
    }>;
};

import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const user = await requireAuth();
    const params = searchParams ? await searchParams : {};
    const period = Array.isArray(params.period)
        ? params.period[0]
        : params.period;
    const rawBrand = Array.isArray(params.brand) ? params.brand[0] : params.brand;
    const brand = normalizeStoreBrandFilter(rawBrand);

    switch (user.role) {
        case "BMS":
            return <BmsDashboard user={user} />;
        case "BMC":
            return <BmcDashboard user={user} period={period} brand={brand} />;
        case "BNM_MANAGER":
            return <BnmDashboard user={user} period={period} brand={brand} />;
        case "ADMIN":
            const [data, realisasiData] = await Promise.all([
                getAdminCommandCenterData(period as any, brand),
                getAdminRealisasiDetail(brand)
            ]);
            return <AdminDashboardV2 user={user} data={data} realisasiData={realisasiData} period={period} brand={brand} />;
        default:
            return <BmsDashboard user={user} />;
    }
}

