import assert from "node:assert/strict";
import { getBmsInputTourSteps } from "./bms-report-tour-steps";

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
assert.match(
    String(
        getBmsInputTourSteps({
            activeStep: "checklist",
            isRepairOnlyMode: false,
        }).find((step) => step.id === "aho")?.content,
    ),
    /nomor tiket AHO/i,
);

console.log("bms-report-tour-steps spec tests passed");
