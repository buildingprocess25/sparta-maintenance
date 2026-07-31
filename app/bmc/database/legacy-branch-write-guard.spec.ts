import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const table = readFileSync(
    new URL("./_components/store-table.tsx", import.meta.url),
    "utf8",
);
const form = readFileSync(
    new URL("./_components/store-form-dialog.tsx", import.meta.url),
    "utf8",
);
const importDialog = readFileSync(
    new URL("./_components/import-store-dialog.tsx", import.meta.url),
    "utf8",
);

assert.match(actions, /getLegacyBranchMessage/);
assert.match(actions, /const legacyBranchMessage = getLegacyStoreBranchError/);
assert.match(actions, /importStores/);
assert.match(table, /getWritableBranchNames/);
assert.match(form, /Tidak ada cabang utama yang dapat dikelola/);
assert.match(importDialog, /Tidak ada cabang utama yang dapat dikelola/);

console.log("legacy branch write guard assertions passed");
