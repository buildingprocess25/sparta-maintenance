import { z } from "zod/v4";

import { getChecklistItemMeta } from "@/lib/checklist-data";
import type { EvidenceDestination } from "./hierarchy-policy";

export const photoUploadContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CHECKLIST"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
  z.object({ kind: z.literal("START_SELFIE"), reportNumber: z.string().min(1) }),
  z.object({ kind: z.literal("START_RECEIPT"), reportNumber: z.string().min(1) }),
  z.object({
    kind: z.literal("START_MATERIAL_STORE"),
    reportNumber: z.string().min(1),
    entryId: z.string().min(1).max(100),
    index: z.number().int().min(0).max(99),
    name: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(200),
  }),
  z.object({ kind: z.literal("COMPLETION_RESULT"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
  z.object({ kind: z.literal("COMPLETION_RECEIPT"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
  z.object({ kind: z.literal("COMPLETION_ADDITIONAL"), reportNumber: z.string().min(1) }),
]);

export type PhotoUploadContext = z.infer<typeof photoUploadContextSchema>;

export type PhotoUploadReport = {
  reportNumber: string;
  createdByNIK: string;
  status: string;
};

export class PhotoUploadContextError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function parsePhotoUploadContext(value: FormDataEntryValue | null): PhotoUploadContext {
  if (typeof value !== "string") {
    throw new PhotoUploadContextError("Konteks upload foto wajib diisi", 400);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(value);
  } catch {
    throw new PhotoUploadContextError("Konteks upload foto tidak valid", 400);
  }

  const parsed = photoUploadContextSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new PhotoUploadContextError("Konteks upload foto tidak valid", 400);
  }

  return parsed.data;
}

export function resolvePhotoEvidenceDestination(
  context: PhotoUploadContext,
  report: PhotoUploadReport,
  sessionUserId: string,
): EvidenceDestination {
  if (report.createdByNIK !== sessionUserId) {
    throw new PhotoUploadContextError("Laporan bukan milik user ini", 403);
  }

  switch (context.kind) {
    case "CHECKLIST": {
      assertAllowedStatus(report.status, ["DRAFT", "ESTIMATION_REJECTED_REVISION"]);
      const item = resolveKnownChecklistItem(context.itemId);
      return {
        kind: "CHECKLIST",
        categoryName: item.categoryName,
        itemId: context.itemId,
        itemName: item.itemName,
      };
    }
    case "START_SELFIE":
      assertAllowedStatus(report.status, [
        "ESTIMATION_APPROVED",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      return { kind: "START_SELFIE" };
    case "START_RECEIPT":
      assertAllowedStatus(report.status, [
        "ESTIMATION_APPROVED",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      return { kind: "START_RECEIPT" };
    case "START_MATERIAL_STORE":
      assertAllowedStatus(report.status, [
        "ESTIMATION_APPROVED",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      return {
        kind: "START_MATERIAL_STORE",
        entryId: context.entryId,
        index: context.index,
        name: context.name,
        city: context.city,
      };
    case "COMPLETION_RESULT": {
      assertAllowedStatus(report.status, [
        "IN_PROGRESS",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      const item = resolveKnownChecklistItem(context.itemId);
      return {
        kind: "COMPLETION_RESULT",
        categoryName: item.categoryName,
        itemId: context.itemId,
        itemName: item.itemName,
      };
    }
    case "COMPLETION_RECEIPT": {
      assertAllowedStatus(report.status, [
        "IN_PROGRESS",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      const item = resolveKnownChecklistItem(context.itemId);
      return {
        kind: "COMPLETION_RECEIPT",
        itemId: context.itemId,
        itemName: item.itemName,
      };
    }
    case "COMPLETION_ADDITIONAL":
      assertAllowedStatus(report.status, [
        "IN_PROGRESS",
        "REVIEW_REJECTED_REVISION",
        "FINAL_REJECTED_REVISION_BNM",
      ]);
      return { kind: "COMPLETION_ADDITIONAL" };
    default:
      return assertNever(context);
  }
}

function resolveKnownChecklistItem(itemId: string) {
  const item = getChecklistItemMeta(itemId);
  if (!item) {
    throw new PhotoUploadContextError("Item checklist tidak ditemukan", 404);
  }
  return item;
}

function assertAllowedStatus(status: string, allowedStatuses: string[]) {
  if (!allowedStatuses.includes(status)) {
    throw new PhotoUploadContextError("Status laporan tidak sesuai untuk upload foto ini", 422);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled photo upload context: ${JSON.stringify(value)}`);
}
