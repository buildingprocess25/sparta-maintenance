import assert from "node:assert/strict";
import { checklistCategories } from "./checklist-data";

const itemsWithCategory = checklistCategories.flatMap((category) =>
    category.items.map((item) => ({ ...item, categoryId: category.id })),
);

const nonPreventive = itemsWithCategory.filter((item) => item.categoryId !== "I");
const preventive = itemsWithCategory.filter((item) => item.categoryId === "I");

for (const item of nonPreventive) {
    assert.equal(
        typeof item.standard === "string" && item.standard.trim().length > 0,
        true,
        `${item.id} wajib punya standard`,
    );
}
for (const item of preventive) {
    assert.equal(item.standard, undefined, `${item.id} tidak boleh punya standard`);
}
assert.equal(itemsWithCategory.filter((item) => item.standard).length, 115);

const standardOf = (id: string) =>
    itemsWithCategory.find((item) => item.id === id)?.standard;

// Contoh item yang kodenya bergeser antara FCKT dan katalog aplikasi.
assert.equal(standardOf("D4"), "Tidak kusam, tidak berlubang");
assert.equal(standardOf("D9"), "Bersih, tidak tersumbat, tidak retak/pecah");
assert.equal(standardOf("H1"), "Tidak keropos, tidak patah");
assert.equal(
    standardOf("H3"),
    "Tidak retak/pecah, tidak berlubang, tidak sobek",
);
assert.equal(standardOf("B11"), "Tidak lepas, tidak pecah, ada arus listrik");
assert.equal(standardOf("B12"), "Tidak keropos, bisa terkunci");
assert.equal(standardOf("C11"), "Bersih, tidak tersumbat");
assert.equal(
    standardOf("A18"),
    "Bersih, kabel & MCB tertata rapih serta berfungsi",
);

console.log("checklist standard tests passed");
