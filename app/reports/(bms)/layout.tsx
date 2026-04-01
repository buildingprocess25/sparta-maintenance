import { requireRole } from "@/lib/authorization";

/**
 * Route group layout for BMS-only routes: /reports/create, /reports/revisi/:reportNumber
 * Acts as an early role guard so any unauthenticated or non-BMS user is redirected
 * before inner pages render.
 */
export default async function BmsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole("BMS");
    return <>{children}</>;
}
