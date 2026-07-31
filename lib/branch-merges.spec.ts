import assert from "node:assert/strict";
import {
    getCanonicalBranchName,
    getLegacyBranchMessage,
    getWritableBranchNames,
} from "./branch-merges";

assert.equal(getCanonicalBranchName("KARAWANG"), "CILEUNGSI RAYA");
assert.equal(getCanonicalBranchName(" CIKOKOL "), "CIKOKOL RAYA");
assert.equal(getCanonicalBranchName("PEKANBARU"), "PEKANBARU");
assert.match(
    getLegacyBranchMessage("KARAWANG") ?? "",
    /CILEUNGSI RAYA.*Cabang Lama/,
);
assert.equal(getLegacyBranchMessage("PEKANBARU"), null);
assert.deepEqual(
    getWritableBranchNames(["KARAWANG", "CIKOKOL RAYA", "CIKOKOL RAYA"]),
    ["CIKOKOL RAYA"],
);

console.log("branch merge assertions passed");
