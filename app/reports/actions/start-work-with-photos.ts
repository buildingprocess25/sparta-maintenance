"use server";

import prisma from "@/lib/prisma";
import { ReportStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getReportStatusLabel } from "@/lib/report-status";
import { getStartWorkEvidenceError } from "@/lib/start-work-evidence";
import type { MaterialStoreJson } from "@/types/report";
import type { MaterialEstimationJson } from "@/types/report";

export interface StartWorkPhotoInput {
  selfieUrls: string[];
  selfieFileIds: string[];
  receiptUrls: string[];
  receiptFileIds: string[];
  materialStores: MaterialStoreJson[];
  materialStorePhotoFileIds: string[];
  /**
   * When true, selfie and receipt photos are optional.
   * Only valid when the total estimated cost is Rp 0 (tanpa biaya).
   */
  skipPhotos?: boolean;
}

/**
 * BMS starts working on an approved report, capturing selfie and nota photos.
 * Stores start-work photos and transitions status: ESTIMATION_APPROVED → IN_PROGRESS.
 * Can only be called by the BMS who owns the report.
 */
export async function startWorkWithPhotos(
  reportNumber: string,
  photos: StartWorkPhotoInput,
) {
  try {
    const user = await requireRole("BMS");
    const headersList = await headers();
    await validateCSRF(headersList);

    const report = await prisma.report.findUnique({
      where: { reportNumber },
      select: {
        createdByNIK: true,
        status: true,
        estimations: true,
        drivePhotoFileIds: true,
      },
    });

    if (!report) {
      return { error: "Laporan tidak ditemukan" };
    }

    if (report.createdByNIK !== user.NIK) {
      return { error: "Anda tidak memiliki akses ke laporan ini" };
    }

    if (report.status !== ReportStatus.ESTIMATION_APPROVED) {
      return {
        error: `Laporan harus berstatus '${getReportStatusLabel("ESTIMATION_APPROVED")}' untuk memulai pekerjaan`,
      };
    }

    const estimations = Array.isArray(report.estimations)
      ? (report.estimations as unknown as MaterialEstimationJson[])
      : [];
    const totalEstimation = estimations.reduce(
      (sum, estimation) => sum + (estimation.totalPrice ?? 0),
      0,
    );
    const isZeroCost = totalEstimation === 0;

    const validSelfieUrls = photos.selfieUrls.filter(
      (url) => url.trim().length > 0,
    );
    const validReceiptUrls = photos.receiptUrls.filter(
      (url) => url.trim().length > 0,
    );
    const normalizedMaterialStores = photos.materialStores.map((store) => ({
      name: store.name.trim(),
      city: store.city.trim(),
      photoUrls: Array.isArray(store.photoUrls)
        ? store.photoUrls
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
        : undefined,
    }));
    const validMaterialStores = normalizedMaterialStores.filter(
      (store) => store.name.length > 0 && store.city.length > 0,
    );
    const validStorePhotoUrls = validMaterialStores.flatMap(
      (store) => store.photoUrls ?? [],
    );

    const evidenceError = getStartWorkEvidenceError({
      isZeroCost,
      skipPhotos: photos.skipPhotos === true,
      selfieCount: validSelfieUrls.length,
      materialStorePhotoCount: validStorePhotoUrls.length,
      receiptCount: validReceiptUrls.length,
      materialStores: normalizedMaterialStores,
    });
    if (evidenceError) {
      return { error: evidenceError };
    }

    // Store selfie URLs as plain URL (single) or JSON array (multiple).
    const selfieUrlValue =
      validSelfieUrls.length === 1
        ? validSelfieUrls[0]
        : JSON.stringify(validSelfieUrls);

    // Collect all Google Drive CDN file IDs for future cleanup
    const existingFileIds = Array.isArray(report.drivePhotoFileIds)
      ? (report.drivePhotoFileIds as string[])
      : [];
    const newFileIds = [
      ...existingFileIds,
      ...photos.selfieFileIds.filter((id) => id.trim().length > 0),
      ...photos.receiptFileIds.filter((id) => id.trim().length > 0),
      ...photos.materialStorePhotoFileIds.filter((id) => id.trim().length > 0),
    ];

    await prisma.$transaction([
      prisma.report.update({
        where: { reportNumber },
        data: {
          status: ReportStatus.IN_PROGRESS,
          startSelfieUrl: selfieUrlValue || null,
          startReceiptUrls:
            validReceiptUrls as unknown as Prisma.InputJsonValue,
          startMaterialStores:
            validMaterialStores as unknown as Prisma.InputJsonValue,
          // Append new Drive file IDs
          drivePhotoFileIds: newFileIds as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.activityLog.create({
        data: {
          reportNumber,
          actorNIK: user.NIK,
          action: "WORK_STARTED",
          notes: null,
        },
      }),
    ]);

    revalidatePath(`/reports/${reportNumber}`);
    revalidatePath("/reports");

    logger.info(
      {
        operation: "startWorkWithPhotos",
        reportNumber,
        userId: user.NIK,
      },
      "BMS started work with photos",
    );

    return { success: true };
  } catch (error) {
    logger.error(
      { operation: "startWorkWithPhotos", reportNumber },
      "Failed to start work with photos",
      error,
    );
    return {
      error: "Gagal memulai pekerjaan",
      detail: getErrorDetail(error),
    };
  }
}
