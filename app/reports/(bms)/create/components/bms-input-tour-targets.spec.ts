import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const checklistSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/checklist-step.tsx"), "utf-8");
const estimationSource = readFileSync(join(process.cwd(), "app/reports/(bms)/create/components/bms-estimation-step.tsx"), "utf-8");

const checklistTargets = [
    "bms-checklist-condition", "bms-checklist-handler", "bms-checklist-photo",
    "bms-checklist-notes", "bms-checklist-aho"
];

const estimationTargets = [
    "bms-estimation-add", "bms-estimation-item", "bms-estimation-name", 
    "bms-estimation-quantity", "bms-estimation-price", "bms-estimation-save", 
    "bms-estimation-actions", "bms-estimation-edit", "bms-estimation-delete"
];

for (const target of checklistTargets) {
    assert.match(checklistSource, new RegExp(`data-tour=["']${target}["']`), `Missing ${target} in checklist-step.tsx`);
}

for (const target of estimationTargets) {
    assert.match(estimationSource, new RegExp(`data-tour=["']${target}["']`), `Missing ${target} in bms-estimation-step.tsx`);
}

console.log("bms input tour target assertions passed");
