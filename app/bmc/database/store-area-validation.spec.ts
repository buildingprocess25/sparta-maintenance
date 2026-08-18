import assert from "node:assert/strict";
import { resolveStoreAreaName } from "./store-area-validation";

const areaNamesByBranch = {
    "CIKOKOL RAYA": ["BALARAJA", "SERANG"],
    "CILEUNGSI RAYA": ["BEKASI"],
};

assert.deepEqual(
    resolveStoreAreaName(
        areaNamesByBranch,
        "CIKOKOL RAYA",
        "  SERANG  ",
    ),
    { valid: true, areaName: "SERANG" },
);
assert.deepEqual(
    resolveStoreAreaName(areaNamesByBranch, "CIKOKOL RAYA", "   "),
    { valid: true, areaName: null },
);
assert.deepEqual(
    resolveStoreAreaName(areaNamesByBranch, "CIKOKOL RAYA", "BEKASI"),
    { valid: false, error: "Cabang lama tidak valid untuk cabang ini" },
);
assert.deepEqual(
    resolveStoreAreaName(
        areaNamesByBranch,
        "CIKOKOL RAYA",
        "ORPHAN",
        "ORPHAN",
    ),
    { valid: true, areaName: "ORPHAN" },
);

console.log("store area validation assertions passed");
