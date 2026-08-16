import assert from "node:assert/strict";
import test from "node:test";

import { parseMaterialNames, searchMaterialNames } from "./material-master";

test("parseMaterialNames trims empty rows and removes case-insensitive duplicates", () => {
  assert.deepEqual(
    parseMaterialNames(" No Drop \r\n\r\nNO DROP\n Semen \nsemen\n"),
    ["No Drop", "Semen"],
  );
});

test("parseMaterialNames preserves the first canonical spelling", () => {
  assert.deepEqual(parseMaterialNames("Tarikan Laci\nTARIKAN LACI"), [
    "Tarikan Laci",
  ]);
});

test("searchMaterialNames returns no suggestions for an empty query", () => {
  assert.deepEqual(searchMaterialNames(["No Drop"], "  "), []);
});

test("searchMaterialNames ranks exact and prefix matches before substring matches", () => {
  assert.deepEqual(
    searchMaterialNames(
      ["Cat Waterproof No Drop Putih", "No Drop Putih", "No Drop"],
      "no drop",
    ),
    ["No Drop", "No Drop Putih", "Cat Waterproof No Drop Putih"],
  );
});

test("searchMaterialNames recommends No Drop for nordrof", () => {
  assert.equal(
    searchMaterialNames(["Cat Tembok", "No Drop", "Pipa PVC"], "nordrof")[0],
    "No Drop",
  );
});

test("searchMaterialNames does not fuzzy-match unrelated values for a short query", () => {
  assert.deepEqual(searchMaterialNames(["No Drop", "Semen"], "xy"), []);
});

test("searchMaterialNames limits rendered recommendations", () => {
  const names = Array.from({ length: 12 }, (_, index) => `Lampu LED ${index}`);

  assert.equal(searchMaterialNames(names, "lampu").length, 8);
  assert.equal(searchMaterialNames(names, "lampu", 3).length, 3);
});
