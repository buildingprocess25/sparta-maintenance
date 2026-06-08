import type { AuthUser } from "@/lib/authorization";
import { ManagerDashboard } from "./manager-dashboard";

export function BnmDashboard({ user }: { user: AuthUser }) {
    return <ManagerDashboard user={user} role="BNM_MANAGER" />;
}
