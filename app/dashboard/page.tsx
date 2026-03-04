import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminDashboard } from "./_components/admin-dashboard";

export default async function DashboardPage() {
    const user = await requireAuth();

    switch (user.role) {
        case "BMS":
            return <BmsDashboard user={user} />;
        case "BMC":
            return <BmcDashboard user={user} />;
        case "BNM_MANAGER":
            return <BnmDashboard user={user} />;
        case "ADMIN":
            return <AdminDashboard user={user} />;
        default:
            return <BmsDashboard user={user} />;
    }
}
