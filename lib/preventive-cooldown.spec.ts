import assert from "node:assert/strict";
import { resolvePreventiveSubmission } from "./preventive-cooldown";

const coreIds = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10"];
const signageIds = ["I11", "I12", "I13"];
const filled = (ids: string[]) =>
    ids.map((itemId) => ({ itemId, preventiveCondition: "OK" }));
const a1 = { itemId: "A1", preventiveCondition: undefined };
const ids = (items: { itemId: string }[]) => items.map((item) => item.itemId);

// Tidak ada masa jeda: 13 item lengkap diterima apa adanya.
const full = [a1, ...filled(coreIds), ...filled(signageIds)];
let result = resolvePreventiveSubmission(full, { core: false, signage: false });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ids(full));

// Tidak ada masa jeda: preventif tanpa I12 ditolak.
result = resolvePreventiveSubmission(
    [a1, ...filled(coreIds), ...filled(["I11", "I13"])],
    { core: false, signage: false },
);
assert.equal(result.error?.detail, "Item preventif I12 wajib diisi");

// Tidak ada masa jeda dan tidak ada item preventif sama sekali: dibiarkan.
result = resolvePreventiveSubmission([a1], { core: false, signage: false });
assert.equal(result.error, undefined);

// Inti masa jeda, signage belum: I1–I10 dibuang, I11–I13 wajib.
result = resolvePreventiveSubmission(full, { core: true, signage: false });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1", ...signageIds]);
result = resolvePreventiveSubmission([a1, ...filled(["I11", "I12"])], {
    core: true,
    signage: false,
});
assert.equal(result.error?.detail, "Item preventif I13 wajib diisi");
result = resolvePreventiveSubmission([a1], { core: true, signage: false });
assert.equal(result.error?.detail, "Item preventif I11 wajib diisi");

// Keduanya masa jeda: semua item I dibuang.
result = resolvePreventiveSubmission(full, { core: true, signage: true });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1"]);

// Hanya signage masa jeda: signage dibuang, inti tetap wajib bila ada preventif.
result = resolvePreventiveSubmission(full, { core: false, signage: true });
assert.equal(result.error, undefined);
assert.deepEqual(ids(result.items), ["A1", ...coreIds]);

// Item I tanpa preventiveCondition dihitung belum diisi.
result = resolvePreventiveSubmission(
    [a1, { itemId: "I11", preventiveCondition: undefined }, ...filled(["I12", "I13"])],
    { core: true, signage: false },
);
assert.equal(result.error?.detail, "Item preventif I11 wajib diisi");

console.log("preventive cooldown tests passed");
