// lib/jobs/aho-import.ts
// Entry point untuk proses import AHO.
// Semua logika berat (parse XLSX, sync DB) dijalankan di Worker Thread terpisah
// agar main thread Node.js tidak pernah membeku.

import path from "path";
import { Worker } from "worker_threads";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Re-export type agar komponen lain tidak perlu mengubah import mereka
export type AhoImportResult = {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
    printDate: string | null;
    errors: string[];
    duplicates: string[];
};

/**
 * Spawn Worker Thread untuk memproses import AHO.
 * Fungsi ini TIDAK MEMBLOKIR main thread — mengembalikan kontrol segera ke caller.
 * Status job diupdate langsung oleh worker ke DB.
 */
export async function processAhoImportJobWithBuffer(
    jobId: string,
    buffer: Buffer,
    requestedByNIK: string,
): Promise<void> {
    const workerPath = path.resolve(
        process.cwd(),
        "lib/jobs/aho-import-worker.ts",
    );

    // Encode buffer ke base64 untuk transfer ke worker.
    // workerData menggunakan structured clone; Buffer tidak selalu ter-clone dengan benar
    // di semua environment, sehingga base64 string lebih aman.
    const bufferBase64 = buffer.toString("base64");

    const worker = new Worker(workerPath, {
        workerData: { jobId, bufferBase64, requestedByNIK },
        // tsx/esm loader diperlukan agar worker bisa menjalankan file TypeScript langsung
        execArgv: ["--import", "tsx/esm"],
    });

    worker.on("message", (msg: { type: string; message?: string }) => {
        if (msg.type === "error") {
            logger.error(
                { operation: "processAhoImportJobWithBuffer", jobId },
                `Worker reported error: ${msg.message}`,
            );
        }
    });

    worker.on("error", (err) => {
        logger.error(
            { operation: "processAhoImportJobWithBuffer", jobId },
            "Worker thread crashed unexpectedly",
            err,
        );
        // Best-effort: tandai job sebagai failed jika worker crash sebelum sempat update sendiri
        prisma.ahoImportJob
            .update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    errorMessage: err.message,
                    completedAt: new Date(),
                    fileBuffer: Buffer.alloc(0),
                },
            })
            .catch(() => {
                // Abaikan DB error pada crash handler
            });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            logger.warn(
                { operation: "processAhoImportJobWithBuffer", jobId, exitCode: code },
                "Worker thread exited with non-zero code",
            );
        }
    });
}

/**
 * Alternatif: proses job berdasarkan jobId saja, membaca buffer dari DB.
 * Bisa digunakan oleh route handler /api/cron jika diperlukan.
 */
export async function processAhoImportJob(jobId: string): Promise<void> {
    const job = await prisma.ahoImportJob.findUnique({ where: { id: jobId } });
    if (!job) {
        logger.error({ operation: "processAhoImportJob", jobId }, "Job not found");
        return;
    }
    return processAhoImportJobWithBuffer(jobId, Buffer.from(job.fileBuffer), job.requestedByNIK);
}
