import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminNewDashboard } from "./_components/admin/admin-new-dashboard";

type DashboardPageProps = {
    searchParams?: Promise<{
        period?: string | string[];
    }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const user = await requireAuth();
    const params = searchParams ? await searchParams : {};
    const period = Array.isArray(params.period)
        ? params.period[0]
        : params.period;

    switch (user.role) {
        case "BMS":
            return <BmsDashboard user={user} />;
        case "BMC":
            return <BmcDashboard user={user} />;
        case "BNM_MANAGER":
            return <BnmDashboard user={user} />;
        case "ADMIN":
            return <AdminNewDashboard user={user} period={period} />;
        default:
            return <BmsDashboard user={user} />;
    }
}

