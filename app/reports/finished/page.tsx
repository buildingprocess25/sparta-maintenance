import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helper";
import { getFinishedReports } from "@/app/reports/actions";
import FinishedList from "./finished-list";

export default async function FinishedReportsPage() {
    const user = await requireAuth();

    if (!user) {
        redirect("/login");
    }

    const { reports, total } = await getFinishedReports();

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
    }));

    return <FinishedList reports={serializedReports} total={total} />;
}
