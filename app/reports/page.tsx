import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helper";
import { getMyReports } from "@/app/reports/actions";
import ReportsList from "./reports-list";

export default async function ReportsPage() {
    const user = await requireAuth();

    if (!user) {
        redirect("/login");
    }

    const { reports, total } = await getMyReports();

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
    }));

    return <ReportsList reports={serializedReports} total={total} />;
}
