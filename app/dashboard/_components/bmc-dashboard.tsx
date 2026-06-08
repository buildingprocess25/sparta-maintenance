import type { AuthUser } from "@/lib/authorization";
import { ManagerDashboard } from "./manager-dashboard";

export function BmcDashboard({ user }: { user: AuthUser }) {
    return <ManagerDashboard user={user} role="BMC" />;
}
