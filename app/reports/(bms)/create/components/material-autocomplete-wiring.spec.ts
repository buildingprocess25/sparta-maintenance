import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const createPage = readSource("app/reports/(bms)/create/page.tsx");
const editPage = readSource("app/reports/(bms)/edit/[id]/page.tsx");
const revisionPage = readSource(
  "app/reports/(bms)/revisi/[reportNumber]/page.tsx",
);
const typesSource = readSource(
  "app/reports/(bms)/create/components/types.ts",
);
const formSource = readSource("app/reports/(bms)/create/create-form.tsx");
const estimationSource = readSource(
  "app/reports/(bms)/create/components/bms-estimation-step.tsx",
);

test("all report form entry pages load and pass the material master", () => {
  for (const source of [createPage, editPage, revisionPage]) {
    assert.match(source, /loadMaterialNames/);
    assert.match(source, /materialNames=\{materialNames\}/);
  }
});

test("material names flow through form props to the estimation step", () => {
  assert.match(typesSource, /materialNames:\s*string\[\]/);
  assert.match(formSource, /materialNames/);
  assert.match(
    formSource,
    /<BmsEstimationStep[\s\S]*materialNames=\{materialNames\}/,
  );
});

test("estimation step uses the reusable combobox without losing the tour target", () => {
  assert.match(estimationSource, /MaterialNameCombobox/);
  assert.match(estimationSource, /options=\{materialNames\}/);
  assert.match(estimationSource, /data-tour="bms-estimation-name"/);
});
