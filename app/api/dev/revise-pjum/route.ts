import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { uploadPjumToDrive } from "@/lib/google-drive/archive";
import type { PjumFormData } from "@/lib/pdf/generate-pjum-form-pdf";
import { calculateRevisedPjumMembership } from "./membership";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";

const bodySchema = z.object({
    pjumExportId: z.string().uuid(),
    /** When true, write revised scalar fields to PjumExport before generating. */
    persistDb: z.boolean().optional().default(false),
    /** When true, upload to Google Drive and set pjumFinalDriveUrl (requires credentials). */
    uploadToDrive: z.boolean().optional().default(false),
    /** Only these keys are applied; omitted keys keep DB values. */
    revisions: z
        .object({
            weekNumber: z.number().int().min(1).max(53).optional(),
            fromDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .optional(),
            toDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .optional(),
            removedReportNumbers: z.array(z.string().min(1)).optional(),
        })
        .optional()
        .default({}),
});

function parseDay(isoDate: string): Date {
    const d = new Date(`${isoDate}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
        throw new Error("Invalid date");
    }
    return d;
}

function isDevReviseAllowed(request: Request): boolean {
    if (process.env.NODE_ENV !== "development") {
        return false;
    }
    const secret = process.env.DEV_PJUM_REVISE_SECRET?.trim();
    if (!secret) {
        return true;
    }
    const header = request.headers.get("x-dev-pjum-revise-secret");
    return header === secret;
}

const SEARCHABLE_PJUM_STATUSES = [
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
] as const;

const NON_COMPLETED_PJUM_STATUSES = [
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

async function getRevisionRangeReports(params: {
    bmsNIK: string;
    branchName: string;
    fromDate: Date;
    toDate: Date;
}) {
    const { bmsNIK, branchName, fromDate, toDate } = params;

    const reports = await prisma.report.findMany({
        where: {
            createdByNIK: bmsNIK,
            branchName,
            status: { in: [...SEARCHABLE_PJUM_STATUSES] },
            OR: [
                {
                    status: "COMPLETED",
                    finishedAt: { not: null, gte: fromDate, lte: toDate },
                },
                {
                    status: "COMPLETED",
                    finishedAt: null,
                    createdAt: { gte: fromDate, lte: toDate },
                },
                {
                    status: { in: [...NON_COMPLETED_PJUM_STATUSES] },
                    createdAt: { gte: fromDate, lte: toDate },
                },
            ],
        },
        select: {
            reportNumber: true,
            status: true,
            pjumExportedAt: true,
            createdAt: true,
            finishedAt: true,
        },
    });

    return reports.sort((a, b) => {
        const left =
            a.status === "COMPLETED" ? (a.finishedAt ?? a.createdAt) : a.createdAt;
        const right =
            b.status === "COMPLETED" ? (b.finishedAt ?? b.createdAt) : b.createdAt;
        return left.getTime() - right.getTime();
    });
}

async function getExistingPjumReports(reportNumbers: string[]) {
    const order = new Map(
        reportNumbers.map((reportNumber, index) => [reportNumber, index]),
    );
    const reports = await prisma.report.findMany({
        where: { reportNumber: { in: reportNumbers } },
        select: {
            reportNumber: true,
            status: true,
            pjumExportedAt: true,
            createdAt: true,
            finishedAt: true,
        },
    });

    return reports.sort(
        (a, b) =>
            (order.get(a.reportNumber) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.reportNumber) ?? Number.MAX_SAFE_INTEGER),
    );
}

function toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
    if (!isDevReviseAllowed(request)) {
        return NextResponse.json(
            {
                error:
                    "Hanya untuk NODE_ENV=development. Set DEV_PJUM_REVISE_SECRET di .env lalu kirim header x-dev-pjum-revise-secret yang sama.",
            },
            { status: 403 },
        );
    }

    const { searchParams } = new URL(request.url);
    const pjumExportId =
        searchParams.get("id") ?? searchParams.get("pjumExportId") ?? "";
    const parsedId = z.string().uuid().safeParse(pjumExportId);
    if (!parsedId.success) {
        return NextResponse.json(
            { error: "PjumExport ID tidak valid" },
            { status: 400 },
        );
    }

    const pjumExport = await prisma.pjumExport.findUnique({
        where: { id: parsedId.data },
    });

    if (!pjumExport) {
        return NextResponse.json(
            { error: "PjumExport tidak ditemukan" },
            { status: 404 },
        );
    }

    const [bmsUser, reports] = await Promise.all([
        prisma.user.findUnique({
            where: { NIK: pjumExport.bmsNIK },
            select: { name: true, NIK: true },
        }),
        prisma.report.findMany({
            where: { reportNumber: { in: pjumExport.reportNumbers } },
            select: {
                reportNumber: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                createdAt: true,
                finishedAt: true,
                pjumExportedAt: true,
            },
        }),
    ]);

    const order = new Map(
        pjumExport.reportNumbers.map((reportNumber, index) => [
            reportNumber,
            index,
        ]),
    );

    return NextResponse.json({
        id: pjumExport.id,
        status: pjumExport.status,
        bmsNIK: pjumExport.bmsNIK,
        bmsName: bmsUser?.name ?? pjumExport.bmsNIK,
        branchName: pjumExport.branchName,
        weekNumber: pjumExport.weekNumber,
        fromDate: toDateInputValue(pjumExport.fromDate),
        toDate: toDateInputValue(pjumExport.toDate),
        reportNumbers: pjumExport.reportNumbers,
        reports: reports
            .sort(
                (a, b) =>
                    (order.get(a.reportNumber) ?? Number.MAX_SAFE_INTEGER) -
                    (order.get(b.reportNumber) ?? Number.MAX_SAFE_INTEGER),
            )
            .map((report) => ({
                reportNumber: report.reportNumber,
                storeName: report.storeName,
                storeCode: report.storeCode,
                branchName: report.branchName,
                status: report.status,
                date:
                    report.status === "COMPLETED"
                        ? (report.finishedAt ?? report.createdAt).toISOString()
                        : report.createdAt.toISOString(),
                pjumExportedAt: report.pjumExportedAt?.toISOString() ?? null,
            })),
    });
}

export async function POST(request: Request) {
    if (!isDevReviseAllowed(request)) {
        return NextResponse.json(
            {
                error:
                    "Hanya untuk NODE_ENV=development. Set DEV_PJUM_REVISE_SECRET di .env lalu kirim header x-dev-pjum-revise-secret yang sama.",
            },
            { status: 403 },
        );
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validasi gagal", details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const { pjumExportId, persistDb, uploadToDrive, revisions } = parsed.data;

    const pjumExport = await prisma.pjumExport.findUnique({
        where: { id: pjumExportId },
    });

    if (!pjumExport) {
        return NextResponse.json({ error: "PjumExport tidak ditemukan" }, { status: 404 });
    }

    let fromDate = new Date(pjumExport.fromDate);
    fromDate.setHours(0, 0, 0, 0);
    let toDate = new Date(pjumExport.toDate);
    toDate.setHours(0, 0, 0, 0);
    let weekNumber = pjumExport.weekNumber;

    try {
        if (revisions.weekNumber !== undefined) {
            weekNumber = revisions.weekNumber;
        }
        if (revisions.fromDate) {
            fromDate = parseDay(revisions.fromDate);
            fromDate.setHours(0, 0, 0, 0);
        }
        if (revisions.toDate) {
            toDate = parseDay(revisions.toDate);
            toDate.setHours(0, 0, 0, 0);
        }
    } catch {
        return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    if (fromDate > toDate) {
        return NextResponse.json(
            { error: "fromDate tidak boleh setelah toDate" },
            { status: 400 },
        );
    }

    const isDateRevision = !!revisions.fromDate || !!revisions.toDate;
    const removedReportNumbers = revisions.removedReportNumbers ?? [];
    const shouldReviseMembership =
        isDateRevision || removedReportNumbers.length > 0;
    const rangeToEndOfDay = new Date(toDate);
    rangeToEndOfDay.setHours(23, 59, 59, 999);
    let reportNumbersForPdf = pjumExport.reportNumbers;

    if (shouldReviseMembership) {
        const rangeReports = isDateRevision
            ? await getRevisionRangeReports({
                  bmsNIK: pjumExport.bmsNIK,
                  branchName: pjumExport.branchName,
                  fromDate,
                  toDate: rangeToEndOfDay,
              })
            : await getExistingPjumReports(pjumExport.reportNumbers);

        if (rangeReports.length === 0) {
            return NextResponse.json(
                {
                    error: "Tidak ada laporan dalam rentang tanggal revisi",
                },
                { status: 400 },
            );
        }

        let membership;
        try {
            membership = calculateRevisedPjumMembership({
                existingReportNumbers: pjumExport.reportNumbers,
                rangeReports,
                removedReportNumbers,
            });
        } catch (error) {
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Gagal menghitung ulang laporan PJUM",
                },
                { status: 400 },
            );
        }

        reportNumbersForPdf = membership.revisedReportNumbers;

        if (reportNumbersForPdf.length === 0) {
            return NextResponse.json(
                { error: "PJUM harus memiliki minimal 1 laporan" },
                { status: 400 },
            );
        }

        if (persistDb) {
            const data: {
                weekNumber?: number;
                fromDate?: Date;
                toDate?: Date;
                reportNumbers: string[];
            } = {
                reportNumbers: membership.revisedReportNumbers,
            };
            if (revisions.weekNumber !== undefined) data.weekNumber = weekNumber;
            if (revisions.fromDate) data.fromDate = fromDate;
            if (revisions.toDate) data.toDate = toDate;

            await prisma.$transaction([
                prisma.pjumExport.update({
                    where: { id: pjumExportId },
                    data,
                }),
                ...(membership.removedReportNumbers.length > 0
                    ? [
                          prisma.report.updateMany({
                              where: {
                                  reportNumber: {
                                      in: membership.removedReportNumbers,
                                  },
                              },
                              data: { pjumExportedAt: null },
                          }),
                      ]
                    : []),
                ...(membership.addedReportNumbers.length > 0
                    ? [
                          prisma.report.updateMany({
                              where: {
                                  reportNumber: {
                                      in: membership.addedReportNumbers,
                                  },
                                  status: "COMPLETED",
                                  pjumExportedAt: null,
                              },
                              data: { pjumExportedAt: new Date() },
                          }),
                      ]
                    : []),
            ]);
        }
    }

    if (persistDb) {
        const data: {
            weekNumber?: number;
            fromDate?: Date;
            toDate?: Date;
        } = {};
        if (revisions.weekNumber !== undefined) data.weekNumber = weekNumber;
        if (revisions.fromDate) data.fromDate = fromDate;
        if (revisions.toDate) data.toDate = toDate;
        if (!shouldReviseMembership && Object.keys(data).length > 0) {
            await prisma.pjumExport.update({
                where: { id: pjumExportId },
                data,
            });
        }
    }

    const [bmcUser, bmsUser, approverUser] = await Promise.all([
        prisma.user.findUnique({
            where: { NIK: pjumExport.createdByNIK },
            select: { name: true, NIK: true },
        }),
        prisma.user.findUnique({
            where: { NIK: pjumExport.bmsNIK },
            select: { name: true, NIK: true },
        }),
        pjumExport.approvedByNIK
            ? prisma.user.findUnique({
                  where: { NIK: pjumExport.approvedByNIK },
                  select: { name: true, NIK: true },
              })
            : Promise.resolve(null),
    ]);

    const reports = await prisma.report.findMany({
        where: { reportNumber: { in: reportNumbersForPdf } },
        select: {
            reportNumber: true,
            items: true,
        },
    });

    const totalExpenditure = reports.reduce(
        (sum, report) => sum + calculateTotalRealisasiFromItems(report.items),
        0,
    );

    const bmsName = bmsUser?.name ?? pjumExport.bmsNIK;
    const submissionDate = (
        pjumExport.approvedAt ?? pjumExport.createdAt
    ).toISOString();

    const fromIso = new Date(fromDate);
    fromIso.setHours(0, 0, 0, 0);
    const toIso = new Date(toDate);
    toIso.setHours(0, 0, 0, 0);

    const pjumFormData: PjumFormData = {
        weekNumber,
        monthName: fromDate.toLocaleString("id-ID", { month: "long" }),
        year: fromDate.getFullYear(),
        bmsName,
        submissionDate,
        totalExpenditure,
        periodeFrom: fromIso.toISOString(),
        periodeTo: toIso.toISOString(),
    };

    const result = await generatePjumPackagePdf({
        reportNumbers: reportNumbersForPdf,
        bmsNIK: pjumExport.bmsNIK,
        from: fromIso.toISOString(),
        to: toIso.toISOString(),
        weekNumber,
        requireExported: !shouldReviseMembership || persistDb,
        requester: {
            NIK: bmcUser?.NIK ?? pjumExport.createdByNIK,
            name: bmcUser?.name ?? pjumExport.createdByNIK,
            branchNames: [pjumExport.branchName],
        },
        pjumData: pjumFormData,
        ...(approverUser
            ? {
                  approver: {
                      NIK: approverUser.NIK,
                      name: approverUser.name,
                  },
                  approvedAt:
                      pjumExport.approvedAt?.toISOString() ??
                      new Date().toISOString(),
              }
            : {}),
    });

    if (uploadToDrive) {
        const uploaded = await uploadPjumToDrive({
            branchName: result.branchName,
            bmsNIK: pjumExport.bmsNIK,
            bmsName,
            year: result.year,
            monthName: result.monthName,
            weekNumber,
            pdfBuffer: result.buffer,
        });
        const url = uploaded.webViewLink ?? uploaded.folderUrl;
        await prisma.pjumExport.update({
            where: { id: pjumExportId },
            data: { pjumFinalDriveUrl: url },
        });
        return NextResponse.json({
            ok: true,
            pjumFinalDriveUrl: url,
            message: "PDF di-upload ke Drive dan pjumFinalDriveUrl diperbarui.",
        });
    }

    const fileName = result.fileName.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${fileName}"`,
        },
    });
}
