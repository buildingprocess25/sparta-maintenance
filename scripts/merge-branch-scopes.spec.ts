import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(
    new URL("./merge-branch-scopes.ts", import.meta.url),
    "utf8",
);

assert.match(script, /--repair-post-merge/);
assert.match(script, /LEGACY_BRANCH_MERGES/);
assert.match(script, /getPostMergeRepairAreaName/);
assert.match(script, /async function refreshPjumAreas\(pjumExportIds\?: string\[\]\)/);
assert.match(script, /where: pjumExportIds \? \{ id: \{ in: pjumExportIds \} \} : undefined/);
assert.match(script, /await refreshPjumAreas\(pjumExports\.map\(\(pjumExport\) => pjumExport\.id\)\)/);
assert.match(script, /Jalankan dengan --repair-post-merge --execute untuk menyimpan perubahan/);

console.log("merge branch repair assertions passed");
