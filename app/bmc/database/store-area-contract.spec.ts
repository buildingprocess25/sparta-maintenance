import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

assert.match(queries, /export async function getStoreAreaNamesByBranches/);
assert.match(queries, /areaName:\s*{\s*not:\s*null\s*}/);
assert.match(actions, /areaName\??:\s*string\s*\|\s*null/);
assert.match(actions, /resolveStoreAreaNameForBranch/);
assert.match(actions, /resolveStoreAreaName/);
assert.match(actions, /areaName:\s*normalizedAreaName/);

console.log("store area contract assertions passed");

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const table = readFileSync(
    new URL("./_components/store-table.tsx", import.meta.url),
    "utf8",
);
const dialog = readFileSync(
    new URL("./_components/store-form-dialog.tsx", import.meta.url),
    "utf8",
);

assert.match(page, /getStoreAreaNamesByBranches/);
assert.match(page, /areaNamesByBranch={areaNamesByBranch}/);
assert.match(table, /areaName:\s*string\s*\|\s*null/);
assert.match(table, /areaNamesByBranch/);
assert.match(dialog, /Cabang Lama/);
assert.match(dialog, /getStoreAreaOptions/);
assert.match(dialog, /setAreaName\(null\)/);
assert.match(dialog, /areaName,/);
console.log("store area UI assertions passed");
