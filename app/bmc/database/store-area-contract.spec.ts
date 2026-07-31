import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

assert.match(queries, /export async function getStoreAreaNamesByBranches/);
assert.match(queries, /areaName:\s*{\s*not:\s*null\s*}/);
assert.match(actions, /areaName\??:\s*string\s*\|\s*null/);
assert.match(actions, /getStoreAreaOptions/);
assert.match(actions, /Cabang lama tidak valid untuk cabang ini/);
assert.match(actions, /areaName:\s*normalizedAreaName/);

console.log("store area contract assertions passed");
