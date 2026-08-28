"use server";

import { headers } from "next/headers";

import prisma from "@/lib/prisma";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { reserveDriveDraft } from "@/lib/reports/drive-draft-service";
import { createPrismaDriveDraftRepository } from "@/lib/reports/drive-draft-prisma-repository";
import { z } from "zod/v4";

const ensureDriveDraftSchema = z.object({
  storeCode: z.string().trim().min(1).max(50),
});

export async function ensureDriveDraftReport(storeCode: string): Promise<
  | { reportNumber: string }
  | {
      error: string;
      detail?: string;
    }
> {
  try {
    const user = await requireRole("BMS");
    const headersList = await headers();
    await validateCSRF(headersList);

    const parsed = ensureDriveDraftSchema.safeParse({ storeCode });
    if (!parsed.success) {
      return { error: "Kode toko tidak valid" };
    }

    const branchName = user.branchNames[0];
    if (!branchName) {
      return { error: "Cabang user tidak valid" };
    }

    return prisma.$transaction((tx) =>
      reserveDriveDraft(createPrismaDriveDraftRepository(tx), {
        bmsNIK: user.NIK,
        branchName,
        storeCode: parsed.data.storeCode,
      }),
    );
  } catch (error) {
    logger.error(
      { operation: "ensureDriveDraftReport" },
      "Failed to reserve Drive draft report",
      error,
    );
    return {
      error: "Gagal menyiapkan folder laporan",
      detail: getErrorDetail(error),
    };
  }
}
