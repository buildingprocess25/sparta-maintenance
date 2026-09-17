import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

const photoStrip = readSource("./photo-strip.tsx");
const revision = readSource("./start-work-revision-section.tsx");
const evidence = readSource("./evidence-capture-section.tsx");
const additional = readSource("./additional-documentation-section.tsx");
const completionItem = readSource("./completion-item-section.tsx");
const client = readSource("../completion-client.tsx");

test("photo collections wrap inside the mobile viewport", () => {
  assert.match(
    photoStrip,
    /grid min-w-0 max-w-full grid-cols-2 gap-2 min-\[360px\]:grid-cols-3/,
  );
  assert.doesNotMatch(photoStrip, /overflow-x-auto|-mx-4|shrink-0/);
  assert.match(revision, /<PhotoStrip[\s\S]*photos=\{store\.photos\}/);
  assert.doesNotMatch(revision, /overflow-x-auto/);
});

test("completion sections constrain intrinsic width", () => {
  for (const source of [revision, evidence, additional, completionItem]) {
    assert.match(source, /min-w-0/);
    assert.match(source, /max-w-full/);
  }
  assert.match(client, /overflow-x-clip/);
  assert.match(client, /min-w-0/);
});

test("realisasi actions and edit dialog stay usable on narrow screens", () => {
  assert.match(completionItem, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(completionItem, /DropdownMenuItem onSelect=/);
  assert.doesNotMatch(completionItem, /DropdownMenuItem onClick=/);
  assert.match(completionItem, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(completionItem, /max-w-\[calc\(100dvw-2rem\)\]/);
  assert.match(
    completionItem,
    /grid-cols-1[^"]*min-\[360px\]:grid-cols-\[minmax\(0,1fr\)_104px\]/,
  );
});
