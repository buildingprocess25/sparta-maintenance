import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/reports/pjum/approval-actions.ts", "utf8");

assert.match(source, /generatePjumVerificationSecret/);
assert.match(source, /buildPjumVerificationUrl/);
assert.match(source, /formatPjumVerificationDisplayCode/);
assert.match(source, /createQrPngDataUrl/);
assert.match(source, /verificationToken/);
assert.match(source, /verificationCode/);
assert.match(source, /verification: \{/);

console.log("pjum approval verification wiring passed");
