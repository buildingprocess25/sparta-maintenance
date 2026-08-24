import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> },
) {
    try {
        await requireRole(["ADMIN"]);

        const { jobId } = await params;

        const job = await prisma.ahoImportJob.findUnique({
            where: { id: jobId },
            select: {
                status: true,
                result: true,
                errorMessage: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            status: job.status,
            result: job.result ?? null,
            errorMessage: job.errorMessage ?? null,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        });
    } catch (error) {
        logger.error({ operation: "pollAhoImportStatus" }, "Failed to poll import status", error);
        return NextResponse.json({ error: "Gagal mengambil status import" }, { status: 500 });
    }
}
