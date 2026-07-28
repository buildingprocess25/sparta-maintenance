import assert from "node:assert/strict";
import {
    getBmsReportTourSteps,
    type BmsReportTourStep,
    type BmsWizardStep,
} from "./bms-report-tour-steps";

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

console.log("bms-report-tour-steps spec tests passed");
