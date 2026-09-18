import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/pjum-validator-stamp.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");
const pjumPdf = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const revisionPdf = fs.readFileSync("lib/pdf/generate-revision-pdf.ts", "utf8");

assert.match(source, /stampPjumValidatorOnPackage/);
assert.match(reportPdf, /verification\?:/);
assert.match(reportPdf, /qrDataUrl/);
assert.match(reportPdf, /Validasi dokumen SPARTA/);
assert.match(reportPdf, /textAlign.*center|center.*textAlign/);
assert.match(pjumPdf, /verification\?:/);
assert.match(pjumPdf, /qrDataUrl/);
assert.match(pjumPdf, /Validasi dokumen SPARTA/);
assert.match(revisionPdf, /verification\?:/);
assert.match(revisionPdf, /qrDataUrl/);
assert.match(revisionPdf, /Validasi dokumen SPARTA/);

console.log("pjum validator stamp source contract passed");
