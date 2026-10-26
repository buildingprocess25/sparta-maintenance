import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
    PHOTO_GUIDES,
    PHOTO_GUIDE_COUNTDOWN_SECONDS,
    getPhotoGuideForItem,
    shouldGateCamera,
} from "./photo-guides";

assert.equal(PHOTO_GUIDE_COUNTDOWN_SECONDS, 5);
assert.equal(getPhotoGuideForItem("A22")?.key, "kwh");
for (const itemId of ["A18", "C6", "E7", "I3"]) {
    assert.equal(getPhotoGuideForItem(itemId)?.key, "panel", itemId);
}
assert.equal(getPhotoGuideForItem("A1"), undefined);

assert.equal(shouldGateCamera("A22", new Set()), true);
assert.equal(shouldGateCamera("A22", new Set(["A22"])), false);
assert.equal(shouldGateCamera("A1", new Set()), false);

for (const guide of Object.values(PHOTO_GUIDES)) {
    assert.equal(
        existsSync(path.join(process.cwd(), "public", guide.src)),
        true,
        guide.src,
    );
}

console.log("photo guide tests passed");
