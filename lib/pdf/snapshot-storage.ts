import "server-only";

import { getSupabaseClient } from "@/lib/supabase";

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
    const storage = getSupabaseClient().storage.from(PDF_SNAPSHOT_BUCKET);
    const { error } = await storage.upload(path, buffer, {
        contentType: "application/pdf",
        upsert: true,
    });

    if (error) {
        throw new Error(`Gagal upload PDF snapshot: ${error.message}`);
    }

    return path;
}

export async function downloadPdfSnapshot(
    path: string,
): Promise<Buffer | null> {
    const storage = getSupabaseClient().storage.from(PDF_SNAPSHOT_BUCKET);
    const { data, error } = await storage.download(path);

    if (error || !data) {
        return null;
    }

    const bytes = await data.arrayBuffer();
    return Buffer.from(bytes);
}

export async function deletePdfSnapshots(paths: string[]) {
    if (paths.length === 0) return;

    const normalized = [...new Set(paths.filter(Boolean))];
    if (normalized.length === 0) return;

    const storage = getSupabaseClient().storage.from(PDF_SNAPSHOT_BUCKET);

    for (let i = 0; i < normalized.length; i += 100) {
        const chunk = normalized.slice(i, i + 100);
        await storage.remove(chunk);
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
