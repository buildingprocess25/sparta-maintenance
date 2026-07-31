import assert from "node:assert/strict";
import {
    getStoreAreaOptions,
    groupAreaNamesByBranch,
} from "./store-area-options";

const areas = groupAreaNamesByBranch(
    ["JAKARTA", "BANDUNG"],
    [
        { branchName: "JAKARTA", areaName: "  JAKSEL  " },
        { branchName: "JAKARTA", areaName: "JAKSEL" },
        { branchName: "JAKARTA", areaName: "JAKBAR" },
        { branchName: "BANDUNG", areaName: null },
        { branchName: "UNKNOWN", areaName: "IGNORED" },
    ],
);

assert.deepEqual(areas, {
    JAKARTA: ["JAKBAR", "JAKSEL"],
    BANDUNG: [],
});
assert.deepEqual(getStoreAreaOptions(areas, "BANDUNG"), []);
assert.deepEqual(
    getStoreAreaOptions(areas, "JAKARTA", "ORPHAN AREA"),
    ["JAKBAR", "JAKSEL", "ORPHAN AREA"],
);

console.log("store area option assertions passed");
