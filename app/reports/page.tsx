import { requireRole } from "@/lib/authorization";
import { getMyReports } from "@/app/reports/actions";
import ReportsList from "./reports-list";

export default async function ReportsPage() {
    await requireRole("BMS");

    const { reports, total } = await getMyReports();

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
    }));

    return <ReportsList reports={serializedReports} total={total} />;
}
