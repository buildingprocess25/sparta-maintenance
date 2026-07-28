import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tourSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/bms-report-tour.tsx"), "utf-8");
const formSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/create-form.tsx"), "utf-8");
const stepsSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/bms-report-tour-steps.ts"), "utf-8");

assert.match(tourSource, /steps=\{currentStep \? \[currentStep\] : \[\]\}/);
assert.match(tourSource, /getBmsInputTourSteps\(\{\s*activeStep,\s*isRepairOnlyMode/);
assert.match(formSource, /isRepairOnlyMode=\{isRepairOnlyMode\}/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"store"/);
assert.doesNotMatch(stepsSource, /wizardStep:\s*"review"/);

console.log("bms report tour runtime assertions passed");
