import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mobile = readFileSync(
    new URL("./bms-reports-mobile.tsx", import.meta.url),
    "utf8",
);
const desktop = readFileSync(
    new URL("./bms-reports-list.tsx", import.meta.url),
    "utf8",
);

assert.match(
    mobile,
    /\/reports\/create\?restore=1&draft=\$\{encodeURIComponent\(report\.reportNumber\)\}/,
    "mobile DRAFT rows must target the clicked draft report number",
);

assert.match(
    desktop,
    /\/reports\/create\?restore=1&draft=\$\{encodeURIComponent\(report\.reportNumber\)\}/,
    "desktop DRAFT rows/actions must target the clicked draft report number",
);

console.log("BMS draft links assertion passed");
