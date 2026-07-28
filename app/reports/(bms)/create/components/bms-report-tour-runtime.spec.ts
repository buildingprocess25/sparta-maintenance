import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tourSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/bms-report-tour.tsx"), "utf-8");
const formSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/create-form.tsx"), "utf-8");
const stepsSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/bms-report-tour-steps.ts"), "utf-8");

assert.match(tourSource, /steps=\{allSteps\}/);
assert.match(tourSource, /getBmsInputTourSteps\(\{\s*activeStep,\s*isRepairOnlyMode/);
assert.match(formSource, /isRepairOnlyMode=\{isRepairOnlyMode\}/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"store"/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"review"/);
assert.match(tourSource, /continuous/);
assert.match(tourSource, /stepIndex=\{stepIndex\}/);
assert.match(tourSource, /data\.action === ACTIONS\.PREV/);
assert.doesNotMatch(tourSource, /setStepIndex\(0\)/);
assert.doesNotMatch(tourSource, /attempts >= 50/);
assert.match(
    tourSource,
    /nextIndex < 0 \|\| nextIndex >= allSteps\.length\) \{\s*dismissedThisSession\.current = true;/,
);
assert.match(tourSource, /scrollIntoView\(\{\s*block: "center"/);
assert.match(tourSource, /skipScroll: true/);
assert.match(tourSource, /currentStep\?\.id !== "add-item"/);
assert.match(tourSource, /setStepIndex\(stepIndex \+ 1\)/);
assert.match(
    stepsSource,
    /estimationSteps\.map\(\(step\) => \(\{ \.\.\.step, disableOverlay: true \}\)\)/,
);

console.log("bms report tour runtime assertions passed");
