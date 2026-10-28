import assert from "node:assert/strict";
import { checklistCategories, type ChecklistCategory } from "@/lib/checklist-data";
import { filterActiveCategories } from "./preventive-visibility";

const base = {
    coreCooling: false,
    signageCooling: false,
    isEditMode: false,
    checklistItemIds: new Set<string>(),
};
const preventiveIds = (cats: ChecklistCategory[]) =>
    cats.filter((cat) => cat.isPreventive).flatMap((cat) => cat.items.map((i) => i.id));
const core = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10"];
const signage = ["I11", "I12", "I13"];

// Tanpa masa jeda: semua kategori, kategori I utuh (objek sama).
let cats = filterActiveCategories(checklistCategories, base);
assert.equal(cats.length, checklistCategories.length);
assert.deepEqual(preventiveIds(cats), [...core, ...signage]);
assert.equal(
    cats.find((cat) => cat.isPreventive),
    checklistCategories.find((cat) => cat.isPreventive),
);

// Inti masa jeda: hanya I11–I13; kategori A tetap ada.
cats = filterActiveCategories(checklistCategories, { ...base, coreCooling: true });
assert.deepEqual(preventiveIds(cats), signage);
assert.ok(cats.some((cat) => cat.id === "A"));

// Keduanya masa jeda: kategori I hilang.
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    signageCooling: true,
});
assert.equal(cats.some((cat) => cat.isPreventive), false);

// Hanya signage masa jeda: I1–I10 saja.
cats = filterActiveCategories(checklistCategories, { ...base, signageCooling: true });
assert.deepEqual(preventiveIds(cats), core);

// Edit: kelompok masa jeda tetap tampil bila laporan berisi item kelompok itu.
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    isEditMode: true,
    checklistItemIds: new Set(["A1", "I1"]),
});
assert.deepEqual(preventiveIds(cats), [...core, ...signage]);
cats = filterActiveCategories(checklistCategories, {
    ...base,
    coreCooling: true,
    signageCooling: true,
    isEditMode: true,
    checklistItemIds: new Set(["I1"]),
});
assert.deepEqual(preventiveIds(cats), core);

console.log("preventive visibility tests passed");
