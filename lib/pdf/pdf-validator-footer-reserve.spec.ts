import assert from "node:assert/strict";
import fs from "node:fs";

const pjumRecap = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");

assert.match(pjumRecap, /paddingBottom:\s*5[6-9]|paddingBottom:\s*6[0-9]/);
assert.match(reportPdf, /paddingBottom:\s*5[6-9]|paddingBottom:\s*6[0-9]/);

console.log("pdf validator footer reserve source contract passed");
