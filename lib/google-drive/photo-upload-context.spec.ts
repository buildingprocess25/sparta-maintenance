import assert from "node:assert/strict";

import {
  parsePhotoUploadContext,
  resolvePhotoEvidenceDestination,
} from "./photo-upload-context";

const formData = new FormData();
formData.append("context", JSON.stringify({ kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" }));

assert.deepEqual(parsePhotoUploadContext(formData.get("context")), {
  kind: "CHECKLIST",
  reportNumber: "Q001-2608-001",
  itemId: "A1",
});

assert.throws(() => parsePhotoUploadContext(null), /wajib diisi/);
assert.throws(
  () =>
    parsePhotoUploadContext(
      JSON.stringify({
        kind: "START_MATERIAL_STORE",
        reportNumber: "Q001-2608-001",
        entryId: "store-1",
        index: -1,
        name: "TB Maju",
        city: "Cianjur",
      }),
    ),
  /tidak valid/,
);

assert.deepEqual(
  resolvePhotoEvidenceDestination(
    { kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" },
    { reportNumber: "Q001-2608-001", createdByNIK: "111", status: "DRAFT" },
    "111",
  ),
  {
    kind: "CHECKLIST",
    categoryName: "A. Bagian Depan Bangunan",
    itemId: "A1",
    itemName: "Bahu Jalan",
  },
);

assert.deepEqual(
  resolvePhotoEvidenceDestination(
    { kind: "START_SELFIE", reportNumber: "Q001-2608-001" },
    { reportNumber: "Q001-2608-001", createdByNIK: "111", status: "ESTIMATION_APPROVED" },
    "111",
  ),
  { kind: "START_SELFIE" },
);

assert.deepEqual(
  resolvePhotoEvidenceDestination(
    { kind: "COMPLETION_RESULT", reportNumber: "Q001-2608-001", itemId: "A1" },
    { reportNumber: "Q001-2608-001", createdByNIK: "111", status: "IN_PROGRESS" },
    "111",
  ),
  {
    kind: "COMPLETION_RESULT",
    categoryName: "A. Bagian Depan Bangunan",
    itemId: "A1",
    itemName: "Bahu Jalan",
  },
);

assert.throws(
  () =>
    resolvePhotoEvidenceDestination(
      { kind: "START_SELFIE", reportNumber: "Q001-2608-001" },
      { reportNumber: "Q001-2608-001", createdByNIK: "111", status: "DRAFT" },
      "111",
    ),
  /Status laporan/,
);

assert.throws(
  () =>
    resolvePhotoEvidenceDestination(
      { kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "UNKNOWN" },
      { reportNumber: "Q001-2608-001", createdByNIK: "111", status: "DRAFT" },
      "111",
    ),
  /Item checklist/,
);

assert.throws(
  () =>
    resolvePhotoEvidenceDestination(
      { kind: "CHECKLIST", reportNumber: "Q001-2608-001", itemId: "A1" },
      { reportNumber: "Q001-2608-001", createdByNIK: "222", status: "DRAFT" },
      "111",
    ),
  /bukan milik/,
);
