import assert from "node:assert/strict";

import {
  describePhotoUploadFailure,
  errorDetail,
  isRetryableFailure,
} from "./upload-failure";

assert.equal(isRetryableFailure({ kind: "network", detail: "Load failed" }), true);
for (const status of [408, 429, 500, 502, 504]) {
  assert.equal(
    isRetryableFailure({ kind: "http", status, serverMessage: null }),
    true,
    `HTTP ${status} must be retried`,
  );
}
for (const status of [400, 401, 403, 404, 409, 413, 422, 503]) {
  assert.equal(
    isRetryableFailure({ kind: "http", status, serverMessage: null }),
    false,
    `HTTP ${status} must not be retried`,
  );
}
assert.equal(isRetryableFailure({ kind: "invalid-response", status: 200 }), false);
assert.equal(isRetryableFailure({ kind: "local-file", detail: "x" }), false);

assert.match(
  describePhotoUploadFailure({ kind: "network", detail: "Load failed" }),
  /Koneksi terputus.*Load failed/,
);
assert.match(
  describePhotoUploadFailure({ kind: "local-file", detail: "WebKitBlobResource error 1" }),
  /tidak dapat dibaca.*WebKitBlobResource error 1.*ambil ulang/,
);
assert.match(
  describePhotoUploadFailure({ kind: "http", status: 401, serverMessage: "Unauthenticated" }),
  /Sesi login sudah berakhir/,
);
assert.match(
  describePhotoUploadFailure({ kind: "http", status: 422, serverMessage: "Status laporan tidak sesuai untuk upload foto ini" }),
  /Status laporan sudah berubah: Status laporan tidak sesuai/,
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 503, serverMessage: "Sedang maintenance" }),
  "Sedang maintenance",
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 400, serverMessage: "File too large. Maximum size: 4 MB" }),
  "Server menolak foto (HTTP 400): File too large. Maximum size: 4 MB.",
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 500, serverMessage: null }),
  "Server menolak foto (HTTP 500).",
);
assert.match(
  describePhotoUploadFailure({ kind: "invalid-response", status: 200 }),
  /Respons server tidak valid \(HTTP 200\)/,
);

assert.equal(errorDetail(new TypeError("Load failed")), "Load failed");
assert.equal(errorDetail(new Error("")), "Error");
assert.equal(errorDetail("boom"), "boom");

console.log("upload failure helper assertions passed");
