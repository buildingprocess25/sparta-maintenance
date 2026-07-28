import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./create-form.tsx", import.meta.url), "utf8");

assert.match(
    source,
    /\{!showDraftDialog && \(\s*<BmsReportTour/,
    "BMS tour must not render while the draft dialog is open",
);

console.log("create form draft-dialog tour guard assertion passed");
