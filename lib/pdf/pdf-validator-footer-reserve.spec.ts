import assert from "node:assert/strict";
import fs from "node:fs";

const pjumRecap = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");
const revisionPdf = fs.readFileSync("lib/pdf/generate-revision-pdf.ts", "utf8");
const packagePdf = fs.readFileSync("lib/pdf/generate-pjum-package-pdf.ts", "utf8");

assert.match(pjumRecap, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.match(reportPdf, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.match(revisionPdf, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.doesNotMatch(packagePdf, /stampPjumValidatorOnPackage/);

console.log("pdf validator footer reserve source contract passed");
