import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminDashboardContent } from "./_components/admin/admin-dashboard-content";
import { AdminDashboardSkeleton } from "./_components/admin/admin-dashboard-skeleton";
import { Suspense } from "react";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";

type DashboardPageProps = {
    searchParams?: Promise<{
        period?: string | string[];
        brand?: string | string[];
    }>;
};

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
            return (
                <Suspense fallback={<AdminDashboardSkeleton />}>
                    <AdminDashboardContent user={user} period={period} brand={brand} />
                </Suspense>
            );
        default:
            return <BmsDashboard user={user} />;
    }
}
