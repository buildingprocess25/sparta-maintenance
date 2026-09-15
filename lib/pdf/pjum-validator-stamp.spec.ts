import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/pjum-validator-stamp.ts", "utf8");

assert.match(source, /stampPjumValidatorOnPackage/);
assert.match(source, /Validasi dokumen SPARTA/);
assert.match(source, /skipPageIndexes/);
assert.match(source, /drawImage/);
assert.match(source, /drawText/);

console.log("pjum validator stamp source contract passed");
