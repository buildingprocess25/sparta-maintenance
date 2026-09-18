import prisma from "@/lib/prisma";
import {
    derivePjumPublicVerificationStatus,
    formatPjumVerificationDisplayCode,
    type PjumPublicVerificationStatus,
} from "@/lib/pjum-verification";
import { resolveReportTotalRealisasi } from "@/lib/realisasi";

export type PublicPjumVerificationResult =
    | { kind: "not-found" }
    | {
          kind: "found";
          status: PjumPublicVerificationStatus;
          displayCode: string;
          branchName: string;
          bmsNIK: string;
          bmsName: string;
          weekNumber: number;
          monthName: string | null;
          fromDate: Date;
          toDate: Date;
          reportNumbers: string[];
          reportCount: number;
          totalExpenditure: number;
          approvedAt: Date | null;
          approverNIK: string | null;
          approverName: string | null;
          pjumFinalDriveUrl: string | null;
      };

type PjumVerificationRecord = {
    id: string;
    status: string;
    verificationCode: string | null;
    branchName: string;
    bmsNIK: string;
    bmsName: string | null;
    weekNumber: number;
    monthName: string | null;
    fromDate: Date;
    toDate: Date;
    reportNumbers: string[];
    approvedAt: Date | null;
    approvedByNIK: string | null;
    approverName: string | null;
    pjumFinalDriveUrl: string | null;
    totalExpenditure: number;
};

export function mapPjumVerificationRecord(
    record: PjumVerificationRecord | null,
): PublicPjumVerificationResult {
    if (!record?.verificationCode) return { kind: "not-found" };

    return {
        kind: "found",
        status: derivePjumPublicVerificationStatus({
            status: record.status,
            approvedAt: record.approvedAt,
            approvedByNIK: record.approvedByNIK,
            pjumFinalDriveUrl: record.pjumFinalDriveUrl,
        }),
        displayCode: formatPjumVerificationDisplayCode(record.verificationCode),
        branchName: record.branchName,
        bmsNIK: record.bmsNIK,
        bmsName: record.bmsName ?? record.bmsNIK,
        weekNumber: record.weekNumber,
        monthName: record.monthName,
        fromDate: record.fromDate,
        toDate: record.toDate,
        reportNumbers: record.reportNumbers,
        reportCount: record.reportNumbers.length,
        totalExpenditure: record.totalExpenditure,
        approvedAt: record.approvedAt,
        approverNIK: record.approvedByNIK,
        approverName: record.approverName ?? record.approvedByNIK,
        pjumFinalDriveUrl: record.pjumFinalDriveUrl,
    };
}

export async function getPublicPjumVerification(
    token: string,
): Promise<PublicPjumVerificationResult> {
    const normalizedToken = token.trim();
    if (!/^[A-Za-z0-9_-]{32,}$/.test(normalizedToken)) {
        return { kind: "not-found" };
    }

    const pjum = await prisma.pjumExport.findUnique({
        where: { verificationToken: normalizedToken },
        select: {
            id: true,
            status: true,
            verificationCode: true,
            branchName: true,
            bmsNIK: true,
            weekNumber: true,
            monthName: true,
            fromDate: true,
            toDate: true,
            reportNumbers: true,
            approvedAt: true,
            approvedByNIK: true,
            pjumFinalDriveUrl: true,
        },
    });

    if (!pjum) return { kind: "not-found" };

    const [bmsUser, approverUser, reports] = await Promise.all([
        prisma.user.findUnique({
            where: { NIK: pjum.bmsNIK },
            select: { name: true },
        }),
        pjum.approvedByNIK
            ? prisma.user.findUnique({
                  where: { NIK: pjum.approvedByNIK },
                  select: { name: true },
              })
            : Promise.resolve(null),
        prisma.report.findMany({
            where: { reportNumber: { in: pjum.reportNumbers } },
            select: { items: true, totalReal: true },
        }),
    ]);

    const totalExpenditure = reports.reduce(
        (sum, report) =>
            sum + resolveReportTotalRealisasi(report.totalReal, report.items),
        0,
    );

    return mapPjumVerificationRecord({
        ...pjum,
        bmsName: bmsUser?.name ?? null,
        approverName: approverUser?.name ?? null,
        totalExpenditure,
    });
}
