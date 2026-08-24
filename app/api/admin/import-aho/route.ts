import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { processAhoImportJob } from "@/lib/jobs/aho-import";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const admin = await requireRole(["ADMIN"]);

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
        }
        if (!file.name.endsWith(".xlsx")) {
            return NextResponse.json({ error: "Hanya menerima file .xlsx" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const job = await prisma.ahoImportJob.create({
            data: {
                requestedByNIK: admin.NIK,
                fileBuffer: buffer,
            },
        });

        logger.info(
            { operation: "enqueueAhoImport", jobId: job.id, userId: admin.NIK },
            "AHO import job enqueued",
        );

        // Fire-and-forget: jalankan proses berat tanpa menunggu selesai
        processAhoImportJob(job.id).catch((err) => {
            logger.error(
                { operation: "enqueueAhoImport", jobId: job.id },
                "Background AHO import process failed",
                err,
            );
        });

        return NextResponse.json({ jobId: job.id }, { status: 202 });
    } catch (error) {
        logger.error({ operation: "enqueueAhoImport" }, "Failed to enqueue AHO import", error);
        return NextResponse.json({ error: "Gagal memulai proses import" }, { status: 500 });
    }
}
