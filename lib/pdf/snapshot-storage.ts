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

    return `pdf-snapshots/reports/${branch}/${storeCode}/${reportNumber}/${checkpoint}/${version}.pdf`;
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

export async function uploadPdfSnapshot(path: string, buffer: Buffer) {
    const segments = path.split("/");
    const fileName = segments.pop();

    if (!fileName) {
        throw new Error(`Path snapshot tidak valid: ${path}`);
    }

    try {
        const folderId = await ensureDriveFolderPath(segments);

        await uploadPdfToDrive({
            fileName,
            folderId,
            buffer,
            overwriteIfExists: true,
        });

        return path;
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

    const normalized = [...new Set(paths.filter(Boolean))];
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
