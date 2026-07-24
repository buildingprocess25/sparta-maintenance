"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { generateReportNumber } from "@/lib/report-helpers";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";
import { checklistCategories } from "@/lib/checklist-data";
import { getLastCategoryIDate } from "./queries";
import { validateEstimationLimit, getBmsActivePeriod, hasBmsRepairItems, createNewBmsPeriod } from "@/lib/balance";
import { isSameJakartaQuarter } from "@/lib/time";

export async function submitReport(data: DraftData) {
  const parsed = draftDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: "Data laporan tidak valid",
      detail: "Periksa kembali data laporan yang diisi.",
    };
  }
  data = parsed.data;

  try {
    const user = await requireRole("BMS");

    const headersList = await headers();
    await validateCSRF(headersList);

    // ── Server-side cooldown validation (defense-in-depth) ────────────────
    // Determine if Category I is currently in cooldown for this store.
    let isCoolingDown = false;
    if (data.storeCode) {
      const lastDateStr = await getLastCategoryIDate(data.storeCode);
      if (lastDateStr) {
        isCoolingDown = isSameJakartaQuarter(new Date(lastDateStr), new Date());
      }
    }

    // All Category I item IDs (preventive)
    const preventiveItemIds = new Set(checklistCategories.filter((cat) => cat.isPreventive).flatMap((cat) => cat.items.map((i) => i.id)));

    // Strip Category I items from payload if cooldown is active.
    // This prevents a client from bypassing the UI restriction.
    let checklistItems = data.checklistItems;
    if (isCoolingDown) {
      checklistItems = checklistItems.filter((item) => !preventiveItemIds.has(item.itemId));
    } else {
      // Quarterly visit: verify all non-preventive items are present.
      const submittedIds = new Set(checklistItems.filter((item) => !preventiveItemIds.has(item.itemId)).map((item) => item.itemId));
      const requiredNonPreventiveIds = checklistCategories.filter((cat) => !cat.isPreventive).flatMap((cat) => cat.items.map((i) => i.id));

      const missingItem = requiredNonPreventiveIds.find((id) => !submittedIds.has(id));
      if (missingItem) {
        return {
          error: "Data laporan tidak lengkap",
          detail: `Item checklist ${missingItem} tidak ditemukan dalam laporan`,
        };
      }
    }

    if (checklistItems.length === 0) {
      return {
        error: "Laporan tidak valid",
        detail: "Minimal satu item checklist harus diisi sebelum laporan dapat dikirim",
      };
    }

    const itemsJson = buildItemsJson({ ...data, checklistItems });
    const estimationsJson = buildEstimationsJson(data);

    // ── Balance Validation ────────────────────────────────────────────────
    // Cek apakah estimasi ini mengandung item BMS (rusak + handler BMS)
    const hasBalanceImpact = hasBmsRepairItems(itemsJson);
    let activePeriodId: string | null = null;

    if (hasBalanceImpact) {
      const balanceError = await validateEstimationLimit(user.NIK, data.totalEstimation || 0);
      if (balanceError) {
        return { error: balanceError };
      }

      // Pastikan ada periode aktif, buat jika belum ada
      const period = await getBmsActivePeriod(user.NIK);
      if (!period) {
        const newPeriod = await createNewBmsPeriod(user.NIK);
        activePeriodId = newPeriod.id;
      } else {
        activePeriodId = period.id;
      }
    }

    // Always get the store to generate the correct sequence prefix
    const store = data.storeCode
      ? await prisma.store.findUnique({
          where: { code: data.storeCode },
          select: { code: true },
        })
      : null;

    // Extract Google Drive CDN file IDs from checklist items
    const drivePhotoFileIds = checklistItems
      .map((item) => item.photoKey) // photoKey now contains Drive file ID
      .filter(Boolean) as string[];

    const reportId = await prisma.$transaction(async (tx) => {
      const reportNumber = await generateReportNumber(store?.code, tx);

      const newReport = await tx.report.create({
        data: {
          reportNumber,
          storeCode: data.storeCode || null,
          storeName: data.storeName || "",
          branchName: data.branchName || "",
          totalEstimation: data.totalEstimation || 0,
          status: "PENDING_ESTIMATION",
          createdByNIK: user.NIK,
          items: itemsJson,
          estimations: estimationsJson,
          drivePhotoFileIds: drivePhotoFileIds as unknown as Prisma.InputJsonValue,
          balancePeriodId: activePeriodId,
        },
      });

      const finalReportId = newReport.reportNumber;

      // Record submission in ActivityLog
      await tx.activityLog.create({
        data: {
          reportNumber: finalReportId,
          actorNIK: user.NIK,
          action: "SUBMITTED",
          notes: null,
        },
      });

      return finalReportId;
    });

    revalidatePath("/reports");

    dispatchNotificationEvent({
      type: "REPORT_SUBMITTED",
      actorNIK: user.NIK,
      reportNumber: reportId,
    });

    return { success: true, reportId };
  } catch (error) {
    logger.error({ operation: "submitReport" }, "Failed to submit report", error);
    return {
      error: "Gagal mengirim laporan",
      detail: getErrorDetail(error),
    };
  }
}
