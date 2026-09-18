import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/generate-pjum-form-pdf.ts", "utf8");

assert.match(
    source,
    /verification\?: \{\s*qrDataUrl: string;\s*displayCode: string;\s*\}/s,
);
assert.match(source, /Scan untuk validasi/);
assert.match(source, /Kode: /);
assert.match(source, /qrDataUrl/);

console.log("pjum form qr source contract passed");
