import type { AuthUser } from "@/lib/authorization";
import { ManagerDashboard } from "./manager-dashboard";

import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export function BnmDashboard({ user, period, brand }: { user: AuthUser, period?: string, brand?: StoreBrandFilter }) {
    return <ManagerDashboard user={user} role="BNM_MANAGER" period={period} brand={brand} />;
}
