import assert from "node:assert/strict";

import {
  buildEvidenceRelativePath,
  buildFinalPdfName,
  buildNewStoreFolderName,
  buildPjumRelativePath,
  buildReportRelativePath,
  buildRevisionPdfName,
  normalizeStoreIdentity,
  parseStoreFolderName,
  sanitizeDriveSegment,
} from "./hierarchy-policy";

assert.deepEqual(
  parseStoreFolderName("QZO1-2207-0001 - ALFAMART  SUDIRMAN - -"),
  {
    noUlok: "QZO1-2207-0001",
    storeName: "ALFAMART  SUDIRMAN",
    storeCode: "-",
  },
);

assert.equal(parseStoreFolderName("ALFAMART SUDIRMAN"), null);
assert.equal(normalizeStoreIdentity("  Alfamart  Sudirman "), "alfamart sudirman");
assert.equal(sanitizeDriveSegment("Bahu/Jalan\\Depan"), "Bahu-Jalan-Depan");

assert.equal(
  buildNewStoreFolderName({ storeName: "ALFAMART SUDIRMAN", storeCode: "Q001" }),
  "BELUM DIISI - ALFAMART SUDIRMAN - Q001",
);

assert.deepEqual(buildReportRelativePath("Q001-2608-001"), ["Q001-2608-001"]);

assert.deepEqual(
  buildEvidenceRelativePath({
    kind: "CHECKLIST",
    categoryName: "A. Depan",
    itemId: "A1",
    itemName: "Bahu/Jalan",
  }),
  ["02 - Foto Checklist", "A. Depan", "A1 - Bahu-Jalan"],
);

assert.deepEqual(buildEvidenceRelativePath({ kind: "START_SELFIE" }), [
  "03 - Foto Mulai Pekerjaan",
  "01 - Selfie BMS",
]);

assert.deepEqual(buildEvidenceRelativePath({ kind: "START_RECEIPT" }), [
  "03 - Foto Mulai Pekerjaan",
  "02 - Nota Pembelian",
]);

assert.deepEqual(
  buildEvidenceRelativePath({
    kind: "START_MATERIAL_STORE",
    entryId: "store-1",
    index: 0,
    name: "TB Maju",
    city: "Cianjur",
  }),
  ["03 - Foto Mulai Pekerjaan", "03 - Toko Material", "01 - TB Maju - Cianjur"],
);

assert.throws(
  () =>
    buildEvidenceRelativePath({
      kind: "START_MATERIAL_STORE",
      entryId: "store-1",
      index: -1,
      name: "TB Maju",
      city: "Cianjur",
    }),
  /index/i,
);

assert.deepEqual(
  buildEvidenceRelativePath({
    kind: "COMPLETION_RESULT",
    categoryName: "A. Depan",
    itemId: "A1",
    itemName: "Bahu Jalan",
  }),
  ["04 - Foto Penyelesaian", "01 - Hasil Pekerjaan", "A. Depan", "A1 - Bahu Jalan"],
);

assert.deepEqual(
  buildEvidenceRelativePath({
    kind: "COMPLETION_RECEIPT",
    itemId: "A1",
    itemName: "Bahu Jalan",
  }),
  ["04 - Foto Penyelesaian", "02 - Nota Realisasi", "A1 - Bahu Jalan"],
);

assert.deepEqual(buildEvidenceRelativePath({ kind: "COMPLETION_ADDITIONAL" }), [
  "04 - Foto Penyelesaian",
  "03 - Dokumentasi Tambahan",
]);

assert.equal(buildFinalPdfName("Q001-2608-001"), "Q001-2608-001 - Laporan Final.pdf");
assert.equal(buildRevisionPdfName("Q001-2608-001"), "Q001-2608-001 - Laporan Revisi.pdf");

assert.deepEqual(
  buildPjumRelativePath({
    bmsNIK: "111",
    bmsName: "BMS User",
    year: 2026,
    monthName: "Agustus",
  }),
  ["PJUM Sparta-Maintenance", "111 - BMS User", "2026", "Agustus"],
);
