import { requireRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { AdminDashboardShell } from "@/app/dashboard/_components/admin/admin-dashboard-shell";
import { RevisiLaporanClient } from "./revisi-laporan-client";
import type { SearchedReport } from "./revisi-laporan-client";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

type Props = {
    searchParams: Promise<{ q?: string }>;
};

export default async function RevisiLaporanPage({ searchParams }: Props) {
    const user = await requireRole("ADMIN");
    const { q } = await searchParams;

    let report: SearchedReport | null = null;

    if (q && q.trim()) {
        const found = await prisma.report.findUnique({
            where: { reportNumber: q.trim() },
            include: {
                createdBy: { select: { name: true, NIK: true } },
                store: { select: { name: true, code: true } },
            },
        });

        if (found) {
            report = {
                reportNumber: found.reportNumber,
                storeName: found.store?.name ?? found.storeName,
                storeCode: found.store?.code ?? found.storeCode,
                branchName: found.branchName,
                status: found.status,
                totalReal: Number(found.totalReal ?? 0),
                createdAt: found.createdAt.toISOString(),
                updatedAt: found.updatedAt.toISOString(),
                bmsName: found.createdBy.name,
                bmsNIK: found.createdByNIK,
                completedPdfPath: found.completedPdfPath,
                reportFinalDriveUrl: found.reportFinalDriveUrl,
                revisedPdfDriveUrl: found.revisedPdfDriveUrl,
                revisedPdfFolderUrl: found.revisedPdfFolderUrl,
                items: (found.items ?? []) as unknown as ReportItemJson[],
                estimations: (found.estimations ?? []) as unknown as MaterialEstimationJson[],
            };
        }
    }

    return (
        <AdminDashboardShell
            user={user}
            title="Revisi Laporan Maintenance"
            contentClassName="h-full"
        >
            <RevisiLaporanClient initialQuery={q ?? ""} report={report} />
        </AdminDashboardShell>
    );
}
