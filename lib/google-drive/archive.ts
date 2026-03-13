import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    ensureDriveFolderPath,
    uploadPdfToDrive,
} from "@/lib/google-drive/files";

function sanitizeDriveName(value: string): string {
    // Google Drive forbids '/' in names; trim and collapse empty values.
    return value.replaceAll("/", "-").trim() || "-";
}

export function buildDriveFolderUrl(folderId: string): string {
    return `https://drive.google.com/drive/folders/${folderId}`;
}

async function getCachedFolderId(cacheKey: string): Promise<string | null> {
    const rows = await prisma.$queryRaw<Array<{ folderId: string }>>(
        Prisma.sql`
            SELECT "folderId"
            FROM "GoogleDriveFolderCache"
            WHERE "cacheKey" = ${cacheKey}
            LIMIT 1
        `,
    );

    return rows[0]?.folderId ?? null;
}

async function saveCachedFolderId(
    cacheKey: string,
    folderId: string,
): Promise<void> {
    await prisma.$executeRaw(
        Prisma.sql`
            INSERT INTO "GoogleDriveFolderCache" ("id", "cacheKey", "folderId", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, ${cacheKey}, ${folderId}, NOW(), NOW())
            ON CONFLICT ("cacheKey")
            DO UPDATE SET
                "folderId" = EXCLUDED."folderId",
                "updatedAt" = NOW()
        `,
    );
}

export async function ensureBmsReportArchiveFolder(params: {
    branchName: string;
    bmsNIK: string;
    bmsName: string;
}): Promise<string> {
    const branchName = sanitizeDriveName(params.branchName);
    const bmsFolder = `${sanitizeDriveName(params.bmsNIK)}-${sanitizeDriveName(params.bmsName)}`;
    const cacheKey = `BMS_REPORT_ARCHIVE:${branchName}:${params.bmsNIK}`;

    const cachedFolderId = await getCachedFolderId(cacheKey);
    if (cachedFolderId) {
        return cachedFolderId;
    }

    const folderId = await ensureDriveFolderPath([
        "Laporan Maintenance",
        branchName,
        bmsFolder,
    ]);

    await saveCachedFolderId(cacheKey, folderId);
    return folderId;
}

export async function ensureBmcReportArchiveFolder(params: {
    branchName: string;
}): Promise<string> {
    const branchName = sanitizeDriveName(params.branchName);
    const cacheKey = `BMC_REPORT_ARCHIVE:${branchName}`;

    const cachedFolderId = await getCachedFolderId(cacheKey);
    if (cachedFolderId) {
        return cachedFolderId;
    }

    const folderId = await ensureDriveFolderPath([
        "Laporan Maintenance",
        branchName,
    ]);

    await saveCachedFolderId(cacheKey, folderId);
    return folderId;
}

export async function ensureBmcPjumArchiveFolder(params: {
    branchName: string;
}): Promise<string> {
    const branchName = sanitizeDriveName(params.branchName);
    const cacheKey = `BMC_PJUM_ARCHIVE:${branchName}`;

    const cachedFolderId = await getCachedFolderId(cacheKey);
    if (cachedFolderId) {
        return cachedFolderId;
    }

    const folderId = await ensureDriveFolderPath(["PJUM", branchName]);
    await saveCachedFolderId(cacheKey, folderId);
    return folderId;
}

export async function uploadCompletedReportToDrive(params: {
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    storeCode: string | null;
    storeName: string;
    reportNumber: string;
    pdfBuffer: Buffer;
}) {
    const bmsRootFolderId = await ensureBmsReportArchiveFolder({
        branchName: params.branchName,
        bmsNIK: params.bmsNIK,
        bmsName: params.bmsName,
    });

    const storeFolderName = `${sanitizeDriveName(params.storeCode ?? "-")}-${sanitizeDriveName(params.storeName)}`;
    const storeFolderId = await ensureDriveFolderPath([
        "Laporan Maintenance",
        sanitizeDriveName(params.branchName),
        `${sanitizeDriveName(params.bmsNIK)}-${sanitizeDriveName(params.bmsName)}`,
        storeFolderName,
    ]);

    const fileName = `${sanitizeDriveName(params.reportNumber)}.pdf`;

    const uploaded = await uploadPdfToDrive({
        fileName,
        folderId: storeFolderId,
        buffer: params.pdfBuffer,
        overwriteIfExists: true,
    });

    return {
        ...uploaded,
        folderId: storeFolderId,
        folderUrl: buildDriveFolderUrl(storeFolderId),
        bmsRootFolderId,
    };
}

export async function uploadPjumToDrive(params: {
    branchName: string;
    year: number;
    monthName: string;
    weekNumber: number;
    pdfBuffer: Buffer;
}) {
    const monthFolderId = await ensureDriveFolderPath([
        "PJUM",
        sanitizeDriveName(params.branchName),
        String(params.year),
        sanitizeDriveName(params.monthName),
    ]);

    const fileName = `PJUM ${sanitizeDriveName(params.monthName)} minggu ke ${params.weekNumber}.pdf`;

    const uploaded = await uploadPdfToDrive({
        fileName,
        folderId: monthFolderId,
        buffer: params.pdfBuffer,
        overwriteIfExists: true,
    });

    return {
        ...uploaded,
        folderId: monthFolderId,
        folderUrl: buildDriveFolderUrl(monthFolderId),
    };
}
