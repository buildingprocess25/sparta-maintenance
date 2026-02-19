import { requireRole } from "@/lib/authorization";
import { getMyReports } from "@/app/reports/actions";
import ReportsList from "./reports-list";

type ReportsPageProps = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        status?: string;
    }>;
};

export default async function ReportsPage(props: ReportsPageProps) {
    const searchParams = await props.searchParams;
    await requireRole("BMS");

    const page = Number(searchParams.page) || 1;
    const limit = 10;
    const search = searchParams.search || "";
    const status = searchParams.status || "all";

    const { reports, total } = await getMyReports({
        page,
        limit,
        search,
        status: status === "all" ? undefined : status.toUpperCase(),
    });

    const totalPages = Math.ceil(total / limit);

    // Serialize Prisma Decimal to plain number for client component
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
    }));

    return (
        <ReportsList
            reports={serializedReports}
            total={total}
            totalPages={totalPages}
            currentPage={page}
        />
    );
}
