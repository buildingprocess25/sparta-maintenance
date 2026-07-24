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

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches: [],
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches: [],
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

for (const role of ["BMC", "BNM_MANAGER"] as const) {
    assert.deepEqual(
        resolveLimitedExportScope({
            role,
            requestedSheets: ["preventive"],
            selectedBranches: ["", "   "],
            assignedBranches,
        }),
        { ok: false, status: 403, error: "Forbidden" },
    );
}

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["preventive"],
        selectedBranches: [" BRANCH B "],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches: [" BRANCH A ", "", " BRANCH B "],
    }),
    { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
);

for (const unsafeBranch of ["all", "HEAD OFFICE"]) {
    assert.deepEqual(
        resolveLimitedExportScope({
            role: "BMC",
            requestedSheets: ["preventive"],
            selectedBranches: [` ${unsafeBranch} `],
            assignedBranches: [unsafeBranch, "BRANCH A"],
        }),
        { ok: false, status: 403, error: "Forbidden" },
    );
}

console.log("limited export access assertions passed");

import { resolveBranchFilterScope } from "./access";

const EXCLUDED_ADMIN_BRANCH_NAME = "HEAD OFFICE"; // Match the constant

const parentMap = new Map([
    ["CHILD A", "BRANCH A"],
    ["CHILD B", "BRANCH A"],
    ["CHILD C", "BRANCH B"],
]);

// exact mode must NOT expand hierarchy
assert.deepEqual(
    resolveBranchFilterScope(["BRANCH A"], "exact", parentMap),
    ["BRANCH A"]
);

// admin-hierarchy mode must expand hierarchy
assert.deepEqual(
    resolveBranchFilterScope(["BRANCH A"], "admin-hierarchy", parentMap).sort(),
    ["BRANCH A", "CHILD A", "CHILD B"].sort()
);

// both modes must exclude EXCLUDED_ADMIN_BRANCH_NAME
assert.deepEqual(
    resolveBranchFilterScope([EXCLUDED_ADMIN_BRANCH_NAME], "exact", parentMap),
    []
);
assert.deepEqual(
    resolveBranchFilterScope([EXCLUDED_ADMIN_BRANCH_NAME], "admin-hierarchy", parentMap),
    []
);

console.log("branch filter scope assertions passed");
