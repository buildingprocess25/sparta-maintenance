import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./submit.ts", import.meta.url), "utf8");

assert.match(
    source,
    /const itemsJson = buildItemsJson\(\{ \.\.\.data, checklistItems \}\)/,
    "submit must build final items from the incoming submit payload",
);

assert.match(
    source,
    /status: initialStatus/,
    "promoted drafts must leave DRAFT status during submit",
);

console.log("submit draft source assertion passed");
