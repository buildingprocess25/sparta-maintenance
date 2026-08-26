import assert from "node:assert/strict";
import {
  createReportArchiveService,
  type ReportArchiveUploadRequest,
} from "./archive";

async function main() {
const uploads: ReportArchiveUploadRequest[] = [];
const documentFolderRequests: unknown[] = [];
const pjumFolderRequests: unknown[] = [];

const service = createReportArchiveService({
  rootFolderId: "root",
  ensureReportDocumentFolder: async (input) => {
    documentFolderRequests.push(input);
    return "documents-1";
  },
  ensurePjumMonthFolder: async (input) => {
    pjumFolderRequests.push(input);
    return "pjum-month-1";
  },
  uploadPdf: async (request) => {
    uploads.push(request);
    return {
      fileId: `${request.fileName}-id`,
      name: request.fileName,
      webViewLink: `https://drive.google.com/file/d/${request.fileName}-id/view`,
      webContentLink: null,
    };
  },
});

const reportInput = {
  branchName: "BALI",
  bmsNIK: "111",
  bmsName: "BMS User",
  storeCode: "Q001",
  storeName: "ALFAMART SUDIRMAN",
  reportNumber: "Q001-2608-001",
  pdfBuffer: Buffer.from("pdf"),
};

const finalUpload = await service.uploadCompletedReportToDrive(reportInput);
const revisionUpload = await service.uploadRevisionReportToDrive(reportInput);

assert.deepEqual(uploads[0], {
  folderId: "documents-1",
  fileName: "Q001-2608-001 - Laporan Final.pdf",
  buffer: reportInput.pdfBuffer,
  overwriteIfExists: true,
});
assert.deepEqual(uploads[1], {
  folderId: "documents-1",
  fileName: "Q001-2608-001 - Laporan Revisi.pdf",
  buffer: reportInput.pdfBuffer,
  overwriteIfExists: true,
});
assert.deepEqual(documentFolderRequests[0], {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "ALFAMART SUDIRMAN",
  reportNumber: "Q001-2608-001",
});
assert.equal(finalUpload.folderUrl, "https://drive.google.com/drive/folders/documents-1");
assert.equal(revisionUpload.folderUrl, "https://drive.google.com/drive/folders/documents-1");

const pjumUpload = await service.uploadPjumToDrive({
  branchName: "BALI",
  bmsNIK: "111",
  bmsName: "BMS User",
  year: 2026,
  monthName: "Agustus",
  weekNumber: 4,
  reportCount: 3,
  documentCode: "abcdef12",
  pdfBuffer: Buffer.from("pjum"),
});

assert.deepEqual(pjumFolderRequests[0], {
  rootFolderId: "root",
  branchName: "BALI",
  bmsNIK: "111",
  bmsName: "BMS User",
  year: 2026,
  monthName: "Agustus",
});
assert.deepEqual(uploads[2], {
  folderId: "pjum-month-1",
  fileName: "PJUM Agustus Minggu ke 4 - 3 Laporan - abcdef12.pdf",
  buffer: Buffer.from("pjum"),
  overwriteIfExists: true,
});
assert.equal(pjumUpload.folderUrl, "https://drive.google.com/drive/folders/pjum-month-1");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
