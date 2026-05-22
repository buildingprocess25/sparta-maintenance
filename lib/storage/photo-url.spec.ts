import assert from "node:assert/strict";
import {
    extractDriveFileId,
    isGoogleDriveCdnUrl,
    normalizePhotoUrl,
    normalizePhotoUrls,
    resolvePhotoUrl,
} from "./photo-url";

assert.equal(normalizePhotoUrl("  https://example.com/photo.jpg  "), "https://example.com/photo.jpg");
assert.equal(normalizePhotoUrl("   "), null);
assert.equal(normalizePhotoUrl(null), null);
assert.equal(normalizePhotoUrl({ url: "https://example.com/photo.jpg" }), null);

assert.deepEqual(
    normalizePhotoUrls([
        "https://example.com/a.jpg",
        "",
        null,
        42,
        "  https://example.com/b.jpg  ",
    ]),
    ["https://example.com/a.jpg", "https://example.com/b.jpg"],
);

assert.equal(isGoogleDriveCdnUrl(null), false);
assert.equal(extractDriveFileId(null), null);
assert.equal(resolvePhotoUrl(null), "");

assert.equal(
    extractDriveFileId("https://lh3.googleusercontent.com/d/drive-file-id"),
    "drive-file-id",
);
assert.equal(
    resolvePhotoUrl("https://lh3.googleusercontent.com/d/drive-file-id"),
    "/api/photos/drive-file-id",
);
