import assert from "node:assert/strict";
import {
    escapeHtml,
    parseDriveProxyTarget,
    safeContentDispositionFilename,
} from "./dev-proxy";

assert.deepEqual(parseDriveProxyTarget("abcDEF12345_-"), {
    id: "abcDEF12345_-",
    kind: "unknown",
});

assert.deepEqual(
    parseDriveProxyTarget("https://drive.google.com/file/d/fileId_123456789/view"),
    { id: "fileId_123456789", kind: "file" },
);

assert.deepEqual(
    parseDriveProxyTarget("https://drive.google.com/drive/folders/folderId_123456789"),
    { id: "folderId_123456789", kind: "folder" },
);

assert.deepEqual(
    parseDriveProxyTarget("https://drive.google.com/open?id=openId_123456789"),
    { id: "openId_123456789", kind: "unknown" },
);

assert.deepEqual(
    parseDriveProxyTarget("https://lh3.googleusercontent.com/d/photoId_123456789=w800"),
    { id: "photoId_123456789", kind: "file" },
);

assert.equal(parseDriveProxyTarget("not-a-url"), null);
assert.equal(escapeHtml(`<script>"x"&'y'</script>`), "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
assert.equal(safeContentDispositionFilename("report/final?.pdf"), "report_final_.pdf");
