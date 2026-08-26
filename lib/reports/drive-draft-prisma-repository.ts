import "server-only";

import { Prisma } from "@prisma/client";
import { generateReportNumber, type PrismaTx } from "@/lib/report-helpers";
import type { DriveDraftRepository, PromoteDriveDraftInput } from "./drive-draft-service";

export function createPrismaDriveDraftRepository(client: PrismaTx): DriveDraftRepository {
  return {
    async findStore(storeCode) {
      return client.store.findUnique({
        where: { code: storeCode },
        select: { code: true, name: true, branchName: true },
      });
    },

    async findDraftByUser(bmsNIK) {
      return client.report.findFirst({
        where: {
          createdByNIK: bmsNIK,
          status: "DRAFT",
        },
        select: {
          reportNumber: true,
          createdByNIK: true,
          branchName: true,
          storeCode: true,
          storeName: true,
        },
        orderBy: { updatedAt: "desc" },
      }).then((draft) =>
        draft?.storeCode
          ? {
              reportNumber: draft.reportNumber,
              bmsNIK: draft.createdByNIK,
              branchName: draft.branchName,
              storeCode: draft.storeCode,
              storeName: draft.storeName,
            }
          : null,
      );
    },

    async findDraftForPromotion(reportNumber, bmsNIK) {
      return client.report.findFirst({
        where: {
          reportNumber,
          createdByNIK: bmsNIK,
          status: "DRAFT",
        },
        select: {
          reportNumber: true,
          createdByNIK: true,
          branchName: true,
          storeCode: true,
          storeName: true,
        },
      }).then((draft) =>
        draft?.storeCode
          ? {
              reportNumber: draft.reportNumber,
              bmsNIK: draft.createdByNIK,
              branchName: draft.branchName,
              storeCode: draft.storeCode,
              storeName: draft.storeName,
            }
          : null,
      );
    },

    async generateReportNumber(storeCode) {
      return generateReportNumber(storeCode, client);
    },

    async createDraft(input) {
      await client.report.create({
        data: {
          reportNumber: input.reportNumber,
          storeCode: input.storeCode,
          storeName: input.storeName,
          branchName: input.branchName,
          totalEstimation: 0,
          status: "DRAFT",
          createdByNIK: input.bmsNIK,
          items: [],
          estimations: [],
          drivePhotoFileIds: [],
        },
      });
    },

    async deleteDraft(reportNumber, bmsNIK) {
      await client.report.deleteMany({
        where: {
          reportNumber,
          createdByNIK: bmsNIK,
          status: "DRAFT",
        },
      });
    },

    async promoteDraft(input: PromoteDriveDraftInput) {
      await client.report.update({
        where: { reportNumber: input.reportNumber },
        data: {
          status: input.status as never,
          totalEstimation: input.totalEstimation,
          items: input.items,
          estimations: input.estimations,
          drivePhotoFileIds: input.drivePhotoFileIds,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        } satisfies Prisma.ReportUpdateInput,
      });
    },
  };
}
