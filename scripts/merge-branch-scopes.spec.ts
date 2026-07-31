import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(
    new URL("./merge-branch-scopes.ts", import.meta.url),
    "utf8",
);

assert.match(script, /--repair-post-merge/);
assert.match(script, /LEGACY_BRANCH_MERGES/);
assert.match(script, /areaName: store\.areaName \|\| oldBranchName/);
assert.match(script, /areaName: report\.areaName \|\| oldBranchName/);
assert.match(script, /Jalankan dengan --repair-post-merge --execute untuk menyimpan perubahan/);

console.log("merge branch repair assertions passed");
