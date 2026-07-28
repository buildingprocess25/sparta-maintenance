import assert from "node:assert/strict";
import { getBmsReportTourSteps, getBmsInputTourSteps } from "./bms-report-tour-steps";

// Test step order for create mode (isEditMode = false)
const createSteps = getBmsReportTourSteps(false);
assert.deepEqual(
    createSteps.map((x) => x.wizardStep),
    ["store", "checklist", "estimation", "review"],
);

// Test step order for revision mode (isEditMode = true)
const revisionSteps = getBmsReportTourSteps(true);
assert.deepEqual(
    revisionSteps.map((x) => x.wizardStep),
    ["checklist", "estimation", "review"],
);

// Test target attributes match requirements
assert.equal(
    createSteps.find((s) => s.wizardStep === "store")?.target,
    "[data-tour='bms-report-store']",
);
assert.equal(
    createSteps.find((s) => s.wizardStep === "checklist")?.target,
    "[data-tour='bms-report-checklist']",
);
assert.equal(
    createSteps.find((s) => s.wizardStep === "estimation")?.target,
    "[data-tour='bms-report-estimation']",
);
assert.equal(
    createSteps.find((s) => s.wizardStep === "review")?.target,
    "[data-tour='bms-report-submit']",
);

assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "checklist", isRepairOnlyMode: false })
        .map((step) => step.id),
    ["condition", "handler", "photo", "notes", "aho"],
);
assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "checklist", isRepairOnlyMode: true })
        .map((step) => step.id),
    ["handler", "photo", "notes", "aho"],
);
assert.deepEqual(
    getBmsInputTourSteps({ activeStep: "estimation", isRepairOnlyMode: false })
        .map((step) => step.id),
    ["add-item", "estimate-item", "estimate-name", "estimate-quantity", "estimate-price", "estimate-save", "estimate-actions", "estimate-edit", "estimate-delete"],
);

console.log("bms-report-tour-steps spec tests passed");
