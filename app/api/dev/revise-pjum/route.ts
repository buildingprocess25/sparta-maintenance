import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { uploadPjumToDrive } from "@/lib/google-drive/archive";
import type { PjumFormData } from "@/lib/pdf/generate-pjum-form-pdf";
import type { ReportItemJson } from "@/types/report";

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

    if (persistDb) {
        const data: {
            weekNumber?: number;
            fromDate?: Date;
            toDate?: Date;
        } = {};
        if (revisions.weekNumber !== undefined) data.weekNumber = weekNumber;
        if (revisions.fromDate) data.fromDate = fromDate;
        if (revisions.toDate) data.toDate = toDate;
        if (Object.keys(data).length > 0) {
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
        where: { reportNumber: { in: pjumExport.reportNumbers } },
        select: {
            reportNumber: true,
            items: true,
        },
    });

    let totalExpenditure = 0;
    for (const report of reports) {
        const items = (report.items ?? []) as unknown as ReportItemJson[];
        for (const item of items) {
            if (item.realisasiItems && item.realisasiItems.length > 0) {
                for (const real of item.realisasiItems) {
                    totalExpenditure += (real.quantity || 0) * (real.price || 0);
                }
            }
        }
    }

    const bmsName = bmsUser?.name ?? pjumExport.bmsNIK;
    const submissionDate = (
        pjumExport.approvedAt ?? pjumExport.createdAt
    ).toISOString();

    const pjumFormData: PjumFormData = {
        weekNumber,
        monthName: fromDate.toLocaleString("id-ID", { month: "long" }),
        year: fromDate.getFullYear(),
        bmsName,
        submissionDate,
        totalExpenditure,
    };

    const fromIso = new Date(fromDate);
    fromIso.setHours(0, 0, 0, 0);
    const toIso = new Date(toDate);
    toIso.setHours(0, 0, 0, 0);

    const result = await generatePjumPackagePdf({
        reportNumbers: pjumExport.reportNumbers,
        bmsNIK: pjumExport.bmsNIK,
        from: fromIso.toISOString(),
        to: toIso.toISOString(),
        weekNumber,
        requireExported: true,
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
