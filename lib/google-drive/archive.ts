import type { DriveFileResult } from "@/lib/google-drive/files";
import type {
  PjumFolderInput,
  ReportFolderInput,
} from "@/lib/google-drive/hierarchy-service";
import {
  buildFinalPdfName,
  buildRevisionPdfName,
  sanitizeDriveSegment,
} from "@/lib/google-drive/hierarchy-policy";

export type ReportArchiveUploadRequest = {
  fileName: string;
  folderId: string;
  buffer: Buffer;
  overwriteIfExists: boolean;
};

type ReportArchiveUploadResult = DriveFileResult & {
  folderId: string;
  folderUrl: string;
  bmsRootFolderId?: string;
};

type ReportArchiveInput = {
  branchName: string;
  bmsNIK: string;
  bmsName: string;
  storeCode: string | null;
  storeName: string;
  reportNumber: string;
  pdfBuffer: Buffer;
};

type PjumArchiveInput = {
  branchName: string;
  bmsNIK: string;
  bmsName: string;
  year: number;
  monthName: string;
  weekNumber: number;
  reportCount?: number;
  documentCode?: string;
  pdfBuffer: Buffer;
};

type ReportArchiveDeps = {
  rootFolderId: string;
  ensureReportDocumentFolder(input: ReportFolderInput): Promise<string>;
  ensurePjumMonthFolder(input: PjumFolderInput): Promise<string>;
  uploadPdf(request: ReportArchiveUploadRequest): Promise<DriveFileResult>;
};

export function buildDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function createReportArchiveService(deps: ReportArchiveDeps) {
  async function uploadToFolder(
    folderId: string,
    request: Omit<ReportArchiveUploadRequest, "folderId" | "overwriteIfExists">,
  ): Promise<ReportArchiveUploadResult> {
    const uploaded = await deps.uploadPdf({
      ...request,
      folderId,
      overwriteIfExists: true,
    });

    return {
      ...uploaded,
      folderId,
      folderUrl: buildDriveFolderUrl(folderId),
    };
  }

  return {
    async uploadCompletedReportToDrive(
      params: ReportArchiveInput,
    ): Promise<ReportArchiveUploadResult> {
      const documentFolderId = await deps.ensureReportDocumentFolder({
        rootFolderId: deps.rootFolderId,
        branchName: params.branchName,
        storeCode: requiredStoreCode(params.storeCode),
        storeName: params.storeName,
        reportNumber: params.reportNumber,
      });

      return uploadToFolder(documentFolderId, {
        fileName: buildFinalPdfName(params.reportNumber),
        buffer: params.pdfBuffer,
      });
    },

    async uploadRevisionReportToDrive(
      params: ReportArchiveInput,
    ): Promise<ReportArchiveUploadResult> {
      const documentFolderId = await deps.ensureReportDocumentFolder({
        rootFolderId: deps.rootFolderId,
        branchName: params.branchName,
        storeCode: requiredStoreCode(params.storeCode),
        storeName: params.storeName,
        reportNumber: params.reportNumber,
      });

      return uploadToFolder(documentFolderId, {
        fileName: buildRevisionPdfName(params.reportNumber),
        buffer: params.pdfBuffer,
      });
    },

    async uploadPjumToDrive(
      params: PjumArchiveInput,
    ): Promise<ReportArchiveUploadResult> {
      const monthFolderId = await deps.ensurePjumMonthFolder({
        rootFolderId: deps.rootFolderId,
        branchName: params.branchName,
        bmsNIK: params.bmsNIK,
        bmsName: params.bmsName,
        year: params.year,
        monthName: params.monthName,
      });

      return uploadToFolder(monthFolderId, {
        fileName: buildPjumPdfName(params),
        buffer: params.pdfBuffer,
      });
    },
  };
}

export async function ensureBmsReportArchiveFolder(params: {
  branchName: string;
  bmsNIK: string;
  bmsName: string;
}): Promise<string> {
  const { ensureDriveFolderPath } = await import("@/lib/google-drive/files");
  return ensureDriveFolderPath([
    sanitizeDriveSegment(params.branchName),
    `${sanitizeDriveSegment(params.bmsNIK)} - ${sanitizeDriveSegment(params.bmsName)}`,
  ]);
}

export async function ensureBmcReportArchiveFolder(params: {
  branchName: string;
}): Promise<string> {
  const { ensureDriveFolderPath } = await import("@/lib/google-drive/files");
  return ensureDriveFolderPath([sanitizeDriveSegment(params.branchName)]);
}

export async function ensureBmcPjumArchiveFolder(params: {
  branchName: string;
}): Promise<string> {
  const { ensureDriveFolderPath } = await import("@/lib/google-drive/files");
  return ensureDriveFolderPath([
    sanitizeDriveSegment(params.branchName),
    "PJUM Sparta-Maintenance",
  ]);
}

export async function uploadCompletedReportToDrive(
  params: ReportArchiveInput,
): Promise<ReportArchiveUploadResult> {
  return (await createDefaultReportArchiveService()).uploadCompletedReportToDrive(
    params,
  );
}

export async function uploadRevisionReportToDrive(
  params: ReportArchiveInput,
): Promise<ReportArchiveUploadResult> {
  return (await createDefaultReportArchiveService()).uploadRevisionReportToDrive(
    params,
  );
}

export async function uploadPjumToDrive(
  params: PjumArchiveInput,
): Promise<ReportArchiveUploadResult> {
  return (await createDefaultReportArchiveService()).uploadPjumToDrive(params);
}

async function createDefaultReportArchiveService() {
  const [
    { getGoogleDriveClient },
    { createGoogleFolderGateway },
    { ensurePjumMonthFolder, ensureReportDocumentFolder },
    { createPrismaDriveFolderCache },
    { uploadPdfToDrive },
    { default: prisma },
  ] = await Promise.all([
    import("@/lib/google-drive/client"),
    import("@/lib/google-drive/folder-gateway"),
    import("@/lib/google-drive/hierarchy-service"),
    import("@/lib/google-drive/folder-cache"),
    import("@/lib/google-drive/files"),
    import("@/lib/prisma"),
  ]);

  const client = getGoogleDriveClient();
  const deps = {
    gateway: createGoogleFolderGateway(client.drive),
    cache: createPrismaDriveFolderCache(prisma),
  };

  return createReportArchiveService({
    rootFolderId: client.config.rootFolderId,
    ensureReportDocumentFolder: (input) =>
      ensureReportDocumentFolder(deps, input),
    ensurePjumMonthFolder: (input) => ensurePjumMonthFolder(deps, input),
    uploadPdf: uploadPdfToDrive,
  });
}

function requiredStoreCode(storeCode: string | null): string {
  const normalized = storeCode?.trim();
  if (!normalized) {
    throw new Error("Store code is required for canonical Drive report archive");
  }
  return normalized;
}

function buildPjumPdfName(params: PjumArchiveInput): string {
  const reportCount = params.reportCount
    ? ` - ${params.reportCount} Laporan`
    : "";
  const documentCode = params.documentCode
    ? ` - ${sanitizeDriveSegment(params.documentCode)}`
    : "";

  return `PJUM ${sanitizeDriveSegment(params.monthName)} Minggu ke ${params.weekNumber}${reportCount}${documentCode}.pdf`;
}
