import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./material-name-combobox.tsx", import.meta.url),
  "utf8",
);

test("material combobox uses bounded fuzzy recommendations", () => {
  assert.match(source, /searchMaterialNames\(options, value\)/);
  assert.match(source, /<Combobox[\s\S]*filter=\{null\}/);
  assert.match(source, /<ComboboxInput/);
});

test("material combobox keeps free text controlled by the caller", () => {
  assert.match(source, /inputValue=\{value\}/);
  assert.match(source, /onInputValueChange=\{onValueChange\}/);
  assert.match(source, /id=\{id\}/);
  assert.match(source, /Teks tetap dapat digunakan/);
});
