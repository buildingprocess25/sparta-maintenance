import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/branches/actions.ts"),
    "utf8",
);

test("scopes list and detail branches to active stores for a selected brand", () => {
    assert.match(source, /getVisibleBrandBranchNames\(\s*brandScope,/);
    assert.match(source, /if \(!scopedBranchNames\.has\(branchName\)\) return null;/);
});
