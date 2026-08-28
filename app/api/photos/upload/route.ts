import { randomUUID } from "node:crypto";

import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { createGoogleFolderGateway } from "@/lib/google-drive/folder-gateway";
import { ensureEvidenceFolder } from "@/lib/google-drive/hierarchy-service";
import {
  parsePhotoUploadContext,
  PhotoUploadContextError,
  resolvePhotoEvidenceDestination,
  type PhotoUploadContext,
} from "@/lib/google-drive/photo-upload-context";
import {
  uploadPhotoToDriveCdn,
  type DrivePhotoUploadOutcome,
} from "@/lib/storage/drive-photo-service";
import { logger } from "@/lib/logger";
import type { EvidenceDestination } from "@/lib/google-drive/hierarchy-policy";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type PhotoUploadSession = {
  userId: string;
  role: string;
};

type PhotoUploadReportRow = {
  reportNumber: string;
  createdByNIK: string;
  status: string;
  branchName: string;
  storeCode: string | null;
  storeName: string;
  store: { code: string; name: string; branchName: string } | null;
};

type PhotoUploadDeps = {
  getSession: () => Promise<PhotoUploadSession | null>;
  loadReport: (reportNumber: string) => Promise<PhotoUploadReportRow | null>;
  rootFolderId: string;
  ensureEvidenceFolder: (input: {
    rootFolderId: string;
    branchName: string;
    storeCode: string;
    storeName: string;
    reportNumber: string;
    evidence: EvidenceDestination;
  }) => Promise<string>;
  uploadPhoto: (
    file: Blob | File,
    input: { parentFolderId: string; fileName: string },
  ) => Promise<DrivePhotoUploadOutcome>;
  randomId?: () => string;
};

export function createPhotoUploadPostHandler(deps: PhotoUploadDeps) {
  return async function photoUploadPost(request: Request): Promise<Response> {
    let session: PhotoUploadSession | null = null;
    let context: PhotoUploadContext | null = null;
    let fileName = "";

    try {
      session = await deps.getSession();
      if (!session) {
        return json({ error: "Unauthenticated" }, 401);
      }
      if (session.role !== "BMS") {
        return json({ error: "Forbidden - BMS role required" }, 403);
      }

      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return json({ error: "No file provided or invalid file" }, 400);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return json(
          { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` },
          400,
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return json({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB` }, 400);
      }

      context = parsePhotoUploadContext(formData.get("context"));
      const report = await deps.loadReport(context.reportNumber);
      if (!report) {
        return json({ error: "Report not found" }, 404);
      }
      if (!report.storeCode && !report.store?.code) {
        return json({ error: "Report store not found" }, 404);
      }

      const evidence = resolvePhotoEvidenceDestination(context, report, session.userId);
      const parentFolderId = await deps.ensureEvidenceFolder({
        rootFolderId: deps.rootFolderId,
        branchName: report.store?.branchName ?? report.branchName,
        storeCode: report.store?.code ?? report.storeCode!,
        storeName: report.store?.name ?? report.storeName,
        reportNumber: report.reportNumber,
        evidence,
      });

      const extension = getFileExtension(file.name) || "jpg";
      fileName = buildSemanticPhotoName(context, extension, deps.randomId?.() ?? randomUUID().slice(0, 8));
      const uploadResult = await deps.uploadPhoto(file, { parentFolderId, fileName });

      if (!uploadResult.success) {
        logger.error(
          {
            operation: "POST /api/photos/upload",
            userId: session.userId,
            reportNumber: context.reportNumber,
            evidenceKind: context.kind,
            fileName,
            error: uploadResult.error,
          },
          "Failed to upload photo to Drive CDN",
        );
        return json({ error: "Failed to upload photo" }, 500);
      }

      return json({ url: uploadResult.url, fileId: uploadResult.fileId }, 200);
    } catch (error) {
      if (error instanceof PhotoUploadContextError) {
        return json({ error: error.message }, error.status);
      }

      const message = error instanceof Error ? error.message : String(error);
      const isAmbiguousDriveFolder = message.includes("Ambiguous Drive store folder");
      logger.error(
        {
          operation: "POST /api/photos/upload",
          userId: session?.userId,
          reportNumber: context?.reportNumber,
          evidenceKind: context?.kind,
          fileName,
          errorMessage: message,
        },
        "Unexpected error in photo upload API",
      );
      return json(
        { error: isAmbiguousDriveFolder ? "Ambiguous Drive folder" : "Internal server error" },
        isAmbiguousDriveFolder ? 409 : 500,
      );
    }
  };
}

export const POST = createPhotoUploadPostHandler({
  async getSession() {
    const session = await import("@/lib/session");
    return session.getSession();
  },
  async loadReport(reportNumber) {
    const { default: prisma } = await import("@/lib/prisma");
    return prisma.report.findUnique({
      where: { reportNumber },
      select: {
        reportNumber: true,
        createdByNIK: true,
        status: true,
        branchName: true,
        storeCode: true,
        storeName: true,
        store: {
          select: {
            code: true,
            name: true,
            branchName: true,
          },
        },
      },
    });
  },
  get rootFolderId() {
    return getDriveCdnClient().config.rootFolderId;
  },
  async ensureEvidenceFolder(input) {
    const { default: prisma } = await import("@/lib/prisma");
    const { createPrismaDriveFolderCache } = await import("@/lib/google-drive/folder-cache");
    const { drive } = getDriveCdnClient();
    return ensureEvidenceFolder(
      {
        gateway: createGoogleFolderGateway(drive),
        cache: createPrismaDriveFolderCache(prisma),
      },
      input,
    );
  },
  uploadPhoto: uploadPhotoToDriveCdn,
});

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status });
}

function getFileExtension(fileName: string): string | null {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? null;
}

function buildSemanticPhotoName(
  context: PhotoUploadContext,
  extension: string,
  randomSuffix: string,
): string {
  const prefixByKind: Record<PhotoUploadContext["kind"], string> = {
    CHECKLIST: "checklist",
    START_SELFIE: "start-selfie",
    START_RECEIPT: "start-receipt",
    START_MATERIAL_STORE: "start-material-store",
    COMPLETION_RESULT: "completion-result",
    COMPLETION_RECEIPT: "completion-receipt",
    COMPLETION_ADDITIONAL: "completion-additional",
  };

  return `${prefixByKind[context.kind]}-001-${randomSuffix}.${extension}`;
}
