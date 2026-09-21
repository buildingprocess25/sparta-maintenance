import type { AuthUser } from "@/lib/authorization";
import { ManagerDashboard } from "./manager-dashboard";

import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export function BmcDashboard({ user, period, brand }: { user: AuthUser, period?: string, brand?: StoreBrandFilter }) {
    return <ManagerDashboard user={user} role="BMC" period={period} brand={brand} />;
}
