"use server";

import { requireRole } from "@/lib/authorization";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import prisma from "@/lib/prisma";
import { generateRevisionPdf } from "@/lib/pdf/generate-revision-pdf";
import {
    uploadPdfToDrive,
    ensureDriveFolderPath,
    deleteFileFromDrive,
} from "@/lib/google-drive/files";
import { buildDriveFolderUrl } from "@/lib/google-drive/archive";
import { logger } from "@/lib/logger";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";
import { JAKARTA_TIME_ZONE, getJakartaYear } from "@/lib/time";
import { cleanReportItemsJson } from "@/app/reports/actions/report-json-helpers";
import type {
    MaterialEstimationJson,
    ReportItemJson,
    RealisasiItemJson,
} from "@/types/report";
import { revalidatePath } from "next/cache";

function sanitizeDriveName(value: string): string {
    return value.replaceAll("/", "-").trim() || "-";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RevisedItemData = {
    itemId: string;
    realisasiItems: {
        materialName: string;
        quantity: number;
        unit: string;
        price: number;
        totalPrice: number;
    }[];
    discountAmount?: number;
    completionNotes?: string;
};

export type SaveRevisionInput = {
    reportNumber: string;
    alasanIntervensi: string;
    items: RevisedItemData[];
    bapPdf: UploadedBapPdf;
};

export type SaveRevisionResult =
    | { success: true; message: string }
    | { success: false; error: string };

export type ApplyRevisionResult =
    | { success: true; folderUrl: string; revisedPdfUrl: string }
    | { success: false; error: string };

export type UploadedBapPdf = {
    fileName: string;
    mimeType: string;
    base64: string;
};

const MAX_BAP_PDF_BYTES = 12 * 1024 * 1024;

function parseBapPdfUpload(upload?: UploadedBapPdf): Buffer {
    if (!upload) {
        throw new Error("BAP wajib diunggah sebelum intervensi disimpan.");
    }

    const fileName = upload.fileName.trim();
    const isPdfMime = upload.mimeType === "application/pdf";
    const isPdfName = fileName.toLowerCase().endsWith(".pdf");

    if (!isPdfMime && !isPdfName) {
        throw new Error("File BAP harus berupa PDF.");
    }

    const buffer = Buffer.from(upload.base64, "base64");

    if (buffer.length === 0) {
        throw new Error("File BAP kosong.");
    }

    if (buffer.length > MAX_BAP_PDF_BYTES) {
        throw new Error("Ukuran file BAP maksimal 12 MB.");
    }

    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        throw new Error("File BAP tidak valid. Pastikan file berupa PDF.");
    }

    return buffer;
}

async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
    const { PDFDocument } = await import("pdf-lib");
    const mergedDoc = await PDFDocument.create();

    for (const buffer of buffers) {
        const sourceDoc = await PDFDocument.load(buffer);
        const pages = await mergedDoc.copyPages(
            sourceDoc,
            sourceDoc.getPageIndices(),
        );
        pages.forEach((page) => mergedDoc.addPage(page));
    }

    return Buffer.from(await mergedDoc.save());
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 1: Save realisasi data to DB (without generating PDF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves revised realisasi data to the Report.items JSON field and
 * recalculates Report.totalReal. Does NOT generate PDF.
 */
export async function saveRealisasiRevision(
    input: SaveRevisionInput,
): Promise<SaveRevisionResult> {
    const user = await requireRole("ADMIN");

    logger.info(
        {
            operation: "saveRealisasiRevision",
            reportNumber: input.reportNumber,
            adminNIK: user.NIK,
        },
        "Admin menyimpan revisi realisasi ke DB",
    );

    try {
        parseBapPdfUpload(input.bapPdf);

        const report = await prisma.report.findUnique({
            where: { reportNumber: input.reportNumber },
        });

        if (!report) {
            return { success: false, error: "Laporan tidak ditemukan." };
        }

        if (report.status !== "COMPLETED") {
            return {
                success: false,
                error: `Revisi hanya bisa dilakukan pada laporan berstatus COMPLETED. Status: ${report.status}`,
            };
        }

        // Merge revised realisasiItems back into items JSON
        const currentItems = (report.items ??
            []) as unknown as ReportItemJson[];

        const revisedByItemId = new Map<string, RevisedItemData>(
            input.items.map((i) => [i.itemId, i]),
        );

        const updatedItems: ReportItemJson[] = currentItems.map((item) => {
            const rev = revisedByItemId.get(item.itemId);
            if (!rev) return item;

            const realisasiItems: RealisasiItemJson[] = rev.realisasiItems.map(
                (r) => ({
                    materialName: r.materialName,
                    quantity: r.quantity,
                    unit: r.unit,
                    price: Math.max(0, r.price),
                    totalPrice:
                        Math.max(0, r.quantity) * Math.max(0, r.price),
                }),
            );
            const subtotal = realisasiItems.reduce(
                (sum, r) => sum + r.totalPrice,
                0,
            );
            const discountAmount = Math.max(0, rev.discountAmount ?? 0);

            if (discountAmount > subtotal) {
                throw new Error(
                    `Potongan harga item ${item.itemId} tidak boleh lebih besar dari subtotal realisasi.`,
                );
            }

            return {
                ...item,
                realisasiItems,
                discountAmount,
                completionNotes:
                    rev.completionNotes !== undefined
                        ? rev.completionNotes
                        : item.completionNotes,
            };
        });

        const newTotalReal = calculateTotalRealisasiFromItems(updatedItems);

        await prisma.report.update({
            where: {
                reportNumber: input.reportNumber,
                status: "COMPLETED",
            },
            data: {
                items: cleanReportItemsJson(updatedItems),
                totalReal: newTotalReal,
            },
        });

        await prisma.activityLog.create({
            data: {
                reportNumber: input.reportNumber,
                actorNIK: user.NIK,
                action: "ADMIN_REALISASI_REVISED",
                notes: `Data realisasi direvisi oleh Admin ${user.name} (${user.NIK}). Alasan: ${input.alasanIntervensi}. Total baru: ${newTotalReal}`,
            },
        });

        logger.info(
            {
                operation: "saveRealisasiRevision",
                reportNumber: input.reportNumber,
                adminNIK: user.NIK,
                newTotalReal,
            },
            "Revisi realisasi berhasil disimpan ke DB",
        );

        revalidatePath(`/dashboard/intervensi/revisi-laporan`);
        revalidatePath(`/dashboard/reports/${input.reportNumber}`);
        revalidatePath(`/dashboard/reports/${input.reportNumber}/intervensi`);
        revalidatePath(`/reports/${input.reportNumber}`);

        return {
            success: true,
            message: `Data realisasi berhasil disimpan. Total Realisasi baru: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(newTotalReal)}`,
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
            {
                operation: "saveRealisasiRevision",
                reportNumber: input.reportNumber,
                error: msg,
            },
            "Gagal menyimpan revisi realisasi",
        );
        return { success: false, error: `Gagal menyimpan: ${msg}` };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action 2: Generate & upload revision PDF (reads latest DB data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates revision PDF for a COMPLETED report and uploads it to Drive.
 * Also regenerates PJUM PDF (rekap + form) if the report is part of an
 * approved PJUM.
 *
 * Reads latest data from DB — so run saveRealisasiRevision first.
 */
export async function applyRealisasiRevision(
    reportNumber: string,
    alasanIntervensi: string,
    bapPdf?: UploadedBapPdf,
): Promise<ApplyRevisionResult> {
    const user = await requireRole("ADMIN");

    logger.info(
        {
            operation: "applyRealisasiRevision",
            reportNumber,
            adminNIK: user.NIK,
        },
        "Admin memulai generate PDF revisi",
    );

    try {
        const bapPdfBuffer = parseBapPdfUpload(bapPdf);

        // ── 1. Fetch report ──────────────────────────────────────────────────
        const report = await prisma.report.findUnique({
            where: { reportNumber },
            include: {
                createdBy: { select: { NIK: true, name: true } },
                store: { select: { name: true, code: true } },
            },
        });

        if (!report) {
            return { success: false, error: "Laporan tidak ditemukan." };
        }

        if (report.status !== "COMPLETED") {
            return {
                success: false,
                error: `Revisi hanya bisa dilakukan pada laporan berstatus COMPLETED. Status saat ini: ${report.status}`,
            };
        }

        // ── 2. Resolve Drive folder ──────────────────────────────────────────
        const branchName = sanitizeDriveName(report.branchName);
        const bmsFolder = `${sanitizeDriveName(report.createdByNIK)}-${sanitizeDriveName(report.createdBy.name)}`;
        const storeName = report.store?.name ?? report.storeName;
        const storeCode = report.store?.code ?? report.storeCode;
        const storeFolderName = `${sanitizeDriveName(storeCode ?? "-")}-${sanitizeDriveName(storeName)}`;
        const reportFolderName = sanitizeDriveName(reportNumber);

        const reportFolderId = await ensureDriveFolderPath([
            "Laporan Maintenance",
            branchName,
            bmsFolder,
            storeFolderName,
            reportFolderName,
        ]);

        const folderUrl = buildDriveFolderUrl(reportFolderId);

        // ── 3. Parse items & estimations ─────────────────────────────────────
        const items = (report.items ?? []) as unknown as ReportItemJson[];
        const estimations = (report.estimations ??
            []) as unknown as MaterialEstimationJson[];

        // ── 4. Generate revision PDF ─────────────────────────────────────────
        const revisionBuffer = await generateRevisionPdf({
            reportNumber: report.reportNumber,
            storeName,
            storeCode,
            branchName: report.branchName,
            bmsName: report.createdBy.name,
            bmsNIK: report.createdByNIK,
            revisedByName: user.name,
            revisedByNIK: user.NIK,
            revisedAt: new Date().toISOString(),
            alasanIntervensi,
            items,
            estimations,
            totalReal: Number(report.totalReal ?? 0),
            finishedAt: report.finishedAt?.toISOString(),
        });

        // ── 5. Jika laporan ada di PJUM → buat halaman addendum ──────────────
        const pjumExport = await prisma.pjumExport.findFirst({
            where: {
                reportNumbers: { has: reportNumber },
                status: "APPROVED",
            },
        });

        let finalPdfBuffer = revisionBuffer;

        if (pjumExport) {
            const addendumBuffer = await generatePjumAddendumPages(
                pjumExport.id,
            );
            if (addendumBuffer) {
                finalPdfBuffer = await mergePdfBuffers([
                    revisionBuffer,
                    addendumBuffer,
                ]);
            }
        }

        if (bapPdfBuffer) {
            finalPdfBuffer = await mergePdfBuffers([
                bapPdfBuffer,
                finalPdfBuffer,
            ]);
        }

        // ── 6. Upload ────────────────────────────────────────────────────────
        const revisionFileName = `${sanitizeDriveName(reportNumber)}-Revisi.pdf`;
        const revisionUploaded = await uploadPdfToDrive({
            fileName: revisionFileName,
            folderId: reportFolderId,
            buffer: finalPdfBuffer,
            overwriteIfExists: true,
        });

        const revisedPdfUrl =
            revisionUploaded.webViewLink ??
            `https://drive.google.com/file/d/${revisionUploaded.fileId}/view`;

        // ── 7. Save to DB ────────────────────────────────────────────────────
        try {
            await prisma.report.update({
                where: { reportNumber, status: "COMPLETED" },
                data: {
                    revisedPdfDriveUrl: revisedPdfUrl,
                    revisedPdfFolderUrl: folderUrl,
                },
            });
        } catch (dbError) {
            logger.error(
                { operation: "applyRealisasiRevision", reportNumber, error: dbError },
                "Gagal update DB setelah upload PDF ke Drive. Reverting Drive upload.",
            );
            await deleteFileFromDrive(revisionUploaded.fileId);
            throw new Error("Gagal menyimpan URL PDF revisi ke database. Status report mungkin sudah berubah.");
        }

        dispatchNotificationEvent({
            type: "REPORT_INTERVENTION_CREATED",
            actorNIK: user.NIK,
            reportNumber,
        });

        logger.info(
            {
                operation: "applyRealisasiRevision",
                reportNumber,
                adminNIK: user.NIK,
                folderUrl,
                revisedPdfUrl,
                hasBapPdf: !!bapPdfBuffer,
            },
            "PDF revisi (termasuk Addendum PJUM jika ada) berhasil di-upload",
        );

        revalidatePath(`/dashboard/intervensi/revisi-laporan`);
        revalidatePath(`/dashboard/reports/${reportNumber}`);
        revalidatePath(`/dashboard/reports/${reportNumber}/intervensi`);
        revalidatePath(`/reports/${reportNumber}`);

        return { success: true, folderUrl, revisedPdfUrl };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
            { operation: "applyRealisasiRevision", reportNumber, error: msg },
            "Gagal generate PDF revisi",
        );
        return { success: false, error: `Gagal generate PDF revisi: ${msg}` };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Generate PJUM Addendum Pages (Rekap + Form)
// ─────────────────────────────────────────────────────────────────────────────

async function generatePjumAddendumPages(
    pjumExportId: string,
): Promise<Buffer | null> {
    const pjumExport = await prisma.pjumExport.findUnique({
        where: { id: pjumExportId },
    });
    if (!pjumExport) return null;

    const reports = await prisma.report.findMany({
        where: { reportNumber: { in: pjumExport.reportNumbers } },
        include: { store: { select: { name: true, code: true } } },
    });

    const bmcUser = await prisma.user.findUnique({
        where: { NIK: pjumExport.createdByNIK },
        select: { name: true, NIK: true },
    });
    const bnmUser = pjumExport.approvedByNIK
        ? await prisma.user.findUnique({
              where: { NIK: pjumExport.approvedByNIK },
              select: { name: true, NIK: true },
          })
        : null;
    const bmsUser = await prisma.user.findUnique({
        where: { NIK: pjumExport.bmsNIK },
        select: { name: true, NIK: true },
    });

    if (!bmcUser || !bmsUser) return null;

    const { generatePjumPdf } = await import("@/lib/pdf/generate-pjum-pdf");
    const rekapBuffer = await generatePjumPdf({
        bmsName: bmsUser.name,
        bmsNIK: bmsUser.NIK,
        bmcName: bmcUser.name,
        bmcNIK: bmcUser.NIK,
        bnmName: bnmUser?.name,
        bnmNIK: bnmUser?.NIK,
        approvedAt: pjumExport.approvedAt?.toISOString() ?? null,
        branchName: pjumExport.branchName,
        from: pjumExport.fromDate.toISOString(),
        to: pjumExport.toDate.toISOString(),
        weekNumber: pjumExport.weekNumber,
        exportedAt: pjumExport.createdAt.toISOString(),
        reports: reports.map((r) => ({
            reportNumber: r.reportNumber,
            createdAt: r.createdAt.toISOString(),
            storeName: r.store?.name ?? r.storeName,
            storeCode: r.store?.code ?? r.storeCode,
            branchName: r.branchName,
            status: r.status,
            totalRealisasi: Number(r.totalReal ?? 0),
        })),
    });

    const { generatePjumFormPdf } =
        await import("@/lib/pdf/generate-pjum-form-pdf");
    const totalExpenditure = reports.reduce(
        (sum, r) => sum + Number(r.totalReal ?? 0),
        0,
    );
    const fromDate = pjumExport.fromDate;
    const monthName = fromDate.toLocaleDateString("id-ID", {
        month: "long",
        timeZone: JAKARTA_TIME_ZONE,
    });
    const year = getJakartaYear(fromDate);

    const formBuffer = await generatePjumFormPdf(
        {
            weekNumber: pjumExport.weekNumber,
            monthName,
            year,
            bmsName: bmsUser.name,
            submissionDate: pjumExport.createdAt.toISOString(),
            totalExpenditure,
            periodeFrom: pjumExport.fromDate.toISOString(),
            periodeTo: pjumExport.toDate.toISOString(),
        },
    );

    const { PDFDocument } = await import("pdf-lib");
    const mergedDoc = await PDFDocument.create();
    const rekapDoc = await PDFDocument.load(rekapBuffer);
    const formDoc = await PDFDocument.load(formBuffer);
    const rekapPages = await mergedDoc.copyPages(
        rekapDoc,
        rekapDoc.getPageIndices(),
    );
    rekapPages.forEach((p) => mergedDoc.addPage(p));
    const formPages = await mergedDoc.copyPages(
        formDoc,
        formDoc.getPageIndices(),
    );
    formPages.forEach((p) => mergedDoc.addPage(p));

    const mergedBuffer = Buffer.from(await mergedDoc.save());

    logger.info(
        { operation: "generatePjumAddendumPages", pjumExportId },
        "Halaman addendum PJUM berhasil di-generate",
    );

    return mergedBuffer;
}
