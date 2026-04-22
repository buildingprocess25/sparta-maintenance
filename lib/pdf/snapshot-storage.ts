import "server-only";

import {
    ensureDriveFolderPath,
    uploadPdfToDrive,
} from "@/lib/google-drive/files";
import { getGoogleDriveClient } from "@/lib/google-drive/client";

// Konstanta ini mungkin tidak dipakai lagi, tapi dipertahankan agar
// tidak terjadi galat jika ada berkas lain yang terlanjur mengimpornya
export const PDF_SNAPSHOT_BUCKET = "reports";

export type ReportPdfCheckpoint =
    | "PENDING_ESTIMATION"
    | "ESTIMATION_APPROVED"
    | "APPROVED_BMC"
    | "COMPLETED";

export function buildReportSnapshotPath(params: {
    branchName: string;
    storeCode?: string | null;
    reportNumber: string;
    checkpoint: ReportPdfCheckpoint;
    version: string;
}) {
    const branch = sanitizePathPart(params.branchName);
    const storeCode = sanitizePathPart(params.storeCode ?? "-");
    const reportNumber = sanitizePathPart(params.reportNumber);
    const checkpoint = sanitizePathPart(params.checkpoint);
    const version = sanitizePathPart(params.version);

    return `pdf-snapshots/reports/${branch}/${storeCode}/${reportNumber}/${checkpoint}_${version}.pdf`;
}

function sanitizeDriveName(value: string): string {
    return value.replaceAll("/", "-").trim() || "-";
}

export function buildFinalReportDrivePath(params: {
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    storeCode: string | null;
    storeName: string;
    reportNumber: string;
}) {
    const branchName = sanitizeDriveName(params.branchName);
    const bmsFolder = `${sanitizeDriveName(params.bmsNIK)}-${sanitizeDriveName(params.bmsName)}`;
    const storeFolderName = `${sanitizeDriveName(params.storeCode ?? "-")}-${sanitizeDriveName(params.storeName)}`;
    const reportFolderName = sanitizeDriveName(params.reportNumber);
    const fileName = sanitizeDriveName(params.reportNumber) + ".pdf";

    return `Laporan Maintenance/${branchName}/${bmsFolder}/${storeFolderName}/${reportFolderName}/${fileName}`;
}


export function buildPjumSnapshotPath(params: {
    branchName: string;
    bmsNIK: string;
    weekNumber: number;
    from: string;
    to: string;
    version: string;
}) {
    const branch = sanitizePathPart(params.branchName);
    const bmsNIK = sanitizePathPart(params.bmsNIK);
    const week = sanitizePathPart(`week-${params.weekNumber}`);
    const from = sanitizePathPart(params.from);
    const to = sanitizePathPart(params.to);
    const version = sanitizePathPart(params.version);

    return `pdf-snapshots/pjum/${branch}/${bmsNIK}/${week}/${from}_${to}/${version}.pdf`;
}

/**
 * Uploads a PDF buffer to the given Drive path and returns
 * the public Drive webViewLink (e.g. https://drive.google.com/file/d/xxx/view).
 */
export async function uploadPdfSnapshot(
    path: string,
    buffer: Buffer,
): Promise<string> {
    const segments = path.split("/");
    const fileName = segments.pop();

    if (!fileName) {
        throw new Error(`Path snapshot tidak valid: ${path}`);
    }

    try {
        const folderId = await ensureDriveFolderPath(segments);

        const result = await uploadPdfToDrive({
            fileName,
            folderId,
            buffer,
            overwriteIfExists: true,
        });

        // Return the direct Drive URL so callers can store it in the DB
        // and link to it without proxying through the server.
        const driveUrl =
            result.webViewLink ??
            `https://drive.google.com/file/d/${result.fileId}/view`;

        return driveUrl;
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(
            `Gagal unggah PDF snapshot ke Google Drive: ${errorMessage}`,
        );
    }
}

export async function downloadPdfSnapshot(
    path: string,
): Promise<Buffer | null> {
    if (isHttpUrl(path)) return null;

    const segments = path.split("/");
    const fileName = segments.pop();

    if (!fileName) return null;

    try {
        const folderId = await ensureDriveFolderPath(segments);
        const { drive } = getGoogleDriveClient();

        // Mencari ID berkas berdasarkan nama di dalam folder tersebut
        const response = await drive.files.list({
            q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
            fields: "files(id)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 1,
        });

        const fileId = response.data.files?.[0]?.id;
        if (!fileId) return null;

        // Mengunduh isi berkas sebagai Buffer
        const file = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" },
        );

        return Buffer.from(file.data as ArrayBuffer);
    } catch (error) {
        console.error("Gagal unduh PDF snapshot dari Google Drive:", error);
        return null;
    }
}

export async function deletePdfSnapshots(paths: string[]) {
    if (paths.length === 0) return;

    const normalized = [
        ...new Set(paths.filter((path) => Boolean(path) && !isHttpUrl(path))),
    ];
    if (normalized.length === 0) return;

    const { drive } = getGoogleDriveClient();

    // Menggunakan perulangan berurutan untuk menghapus berkas agar terhindar dari
    // pemblokiran batas permintaan (rate limit) API Google Drive
    for (const path of normalized) {
        try {
            const segments = path.split("/");
            const fileName = segments.pop();
            if (!fileName) continue;

            const folderId = await ensureDriveFolderPath(segments);

            const response = await drive.files.list({
                q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
                fields: "files(id)",
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                pageSize: 1,
            });

            const fileId = response.data.files?.[0]?.id;
            if (fileId) {
                await drive.files.delete({
                    fileId,
                    supportsAllDrives: true,
                });
            }
        } catch (error) {
            console.error(
                `Gagal menghapus snapshot Google Drive untuk path ${path}:`,
                error,
            );
        }
    }
}

function sanitizePathPart(input: string) {
    return input
        .trim()
        .replaceAll("/", "-")
        .replaceAll("\\", "-")
        .replaceAll("..", "-")
        .replaceAll(" ", "-")
        .toLowerCase();
}

function isHttpUrl(input: string): boolean {
    return /^https?:\/\//i.test(input);
}
