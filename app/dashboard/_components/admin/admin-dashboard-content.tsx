import { type AuthUser } from "@/lib/authorization";
import { getAdminCommandCenterData, getAdminRealisasiDetail } from "../../queries";
import { AdminDashboardV2 } from "./admin-dashboard-v2";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export async function AdminDashboardContent({
    user,
    period,
    brand,
}: {
    user: AuthUser;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const [data, realisasiData] = await Promise.all([
        getAdminCommandCenterData(period as any, brand),
        getAdminRealisasiDetail(brand)
    ]);

    return (
        <AdminDashboardV2 
            user={user} 
            data={data} 
            realisasiData={realisasiData} 
            period={period} 
            brand={brand} 
        />
    );
}
