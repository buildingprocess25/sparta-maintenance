import assert from "node:assert/strict";
import { resolveLimitedExportScope } from "./access";

const assignedBranches = ["BRANCH A", "BRANCH B", ""];

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["pjum"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["pjum"],
        selectedBranches: ["BRANCH B"],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["pjum"],
        selectedBranches: ["FOREIGN BRANCH"],
        assignedBranches,
    }),
    {
        ok: false,
        status: 403,
        error: "Anda tidak punya akses ke cabang ini",
    },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["materials"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["reports", "pjum"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
);

console.log("limited export access assertions passed");
