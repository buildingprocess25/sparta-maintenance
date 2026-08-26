import assert from "node:assert/strict";

import { createPhotoUploadPostHandler } from "./route";

async function makeRequest(context: unknown, file = new File(["x"], "photo.jpg", { type: "image/jpeg" })) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("context", JSON.stringify(context));
  return new Request("http://localhost/api/photos/upload", {
    method: "POST",
    body: formData,
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function run() {
const uploadCalls: Array<{ parentFolderId: string; fileName: string }> = [];
const handler = createPhotoUploadPostHandler({
  getSession: async () => ({ userId: "111", role: "BMS" }),
  loadReport: async () => ({
    reportNumber: "Q001-2608-001",
    createdByNIK: "111",
    status: "DRAFT",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
    store: { code: "Q001", name: "ALFAMART A", branchName: "BALI" },
  }),
  rootFolderId: "root",
  ensureEvidenceFolder: async () => "evidence-123",
  uploadPhoto: async (_file, input) => {
    uploadCalls.push(input);
    return { success: true, fileId: "file-123", url: "https://lh3.googleusercontent.com/d/file-123" };
  },
  randomId: () => "abcdef12",
});

const response = await handler(
  await makeRequest({ kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" }),
);
assert.equal(response.status, 200);
assert.deepEqual(await readJson(response), {
  url: "https://lh3.googleusercontent.com/d/file-123",
  fileId: "file-123",
});
assert.equal(uploadCalls.length, 1);
assert.equal(uploadCalls[0]?.parentFolderId, "evidence-123");
assert.match(uploadCalls[0]?.fileName ?? "", /^checklist-001-abcdef12\.jpg$/);

const blockedUploadCalls: Array<{ parentFolderId: string; fileName: string }> = [];
const blockedHandler = createPhotoUploadPostHandler({
  getSession: async () => ({ userId: "111", role: "BMS" }),
  loadReport: async () => ({
    reportNumber: "Q001-2608-001",
    createdByNIK: "111",
    status: "DRAFT",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
    store: { code: "Q001", name: "ALFAMART A", branchName: "BALI" },
  }),
  rootFolderId: "root",
  ensureEvidenceFolder: async () => {
    throw new Error("Ambiguous Drive store folder code match");
  },
  uploadPhoto: async (_file, input) => {
    blockedUploadCalls.push(input);
    return { success: true, fileId: "file-123", url: "url" };
  },
  randomId: () => "abcdef12",
});

const blocked = await blockedHandler(
  await makeRequest({ kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" }),
);
assert.equal(blocked.status, 409);
assert.equal(blockedUploadCalls.length, 0);

const missingReport = await createPhotoUploadPostHandler({
  getSession: async () => ({ userId: "111", role: "BMS" }),
  loadReport: async () => null,
  rootFolderId: "root",
  ensureEvidenceFolder: async () => "evidence",
  uploadPhoto: async () => ({ success: true, fileId: "file", url: "url" }),
})(await makeRequest({ kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" }));
assert.equal(missingReport.status, 404);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
