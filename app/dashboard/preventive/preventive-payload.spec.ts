import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actionsSource = readFileSync(
    new URL("./actions.ts", import.meta.url),
    "utf8",
);
const tableSource = readFileSync(
    new URL("./_components/admin-preventive-table.tsx", import.meta.url),
    "utf8",
);

assert.doesNotMatch(actionsSource, /pendingRows:\s*PreventiveRow\[\]/);
assert.doesNotMatch(actionsSource, /\n\s+pendingRows,\n/);
assert.doesNotMatch(tableSource, /[^\S\r\n]+$/m);
assert.match(
    tableSource,
    /setData\(\[\]\);\s+setNextCursor\(null\);\s+setIsLoading\(true\);\s+setActiveTab\(val\);/,
);
assert.match(
    tableSource,
    /<TabsContent value="matrix" className="mt-0">[\s\S]*?\{isLoading \? \(/,
);

console.log("preventive payload assertions passed");
