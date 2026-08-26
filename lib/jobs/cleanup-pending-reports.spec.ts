import assert from "node:assert/strict";
import { createCleanupPendingReportsJob } from "./cleanup-pending-reports";

async function main() {
  const deletedFiles: string[] = [];
  const deletedRows: string[] = [];
  const reports = [
    {
      reportNumber: "DRAFT-1",
      status: "DRAFT",
      drivePhotoFileIds: ["file-1", "file-2"],
    },
    {
      reportNumber: "DRAFT-2",
      status: "DRAFT",
      drivePhotoFileIds: ["file-fail"],
    },
  ];

  const cleanup = createCleanupPendingReportsJob({
    now: () => new Date("2026-08-27T00:00:00.000Z"),
    getPendingExpiryDays: () => 14,
    findExpiredReports: async (cutoffDate) => {
      assert.equal(cutoffDate.toISOString(), "2026-08-13T00:00:00.000Z");
      return reports;
    },
    deleteReportWithLogs: async (reportNumber) => {
      deletedRows.push(reportNumber);
    },
    deleteDriveFile: async (fileId) => {
      if (fileId === "file-fail") {
        throw new Error("Drive delete failed");
      }
      deletedFiles.push(fileId);
    },
  });

  const result = await cleanup();

  assert.deepEqual(deletedFiles, ["file-1", "file-2"]);
  assert.deepEqual(deletedRows, ["DRAFT-1"]);
  assert.equal(result.reportsFound, 2);
  assert.equal(result.reportsDeleted, 1);
  assert.equal(result.photosDeleted, 2);
  assert.deepEqual(result.failedReports, ["DRAFT-2"]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
