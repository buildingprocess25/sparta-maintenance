import test from "node:test";
import * as assert from "node:assert";
import {
    getStoreOwnershipFormValue,
    normalizeStoreBrandKey,
    normalizeStoreOwnershipForBrand,
    shouldShowStoreOwnershipSelect,
} from "./store-ownership";

test("normalizeStoreBrandKey trims and uppercases known brands", () => {
    assert.strictEqual(normalizeStoreBrandKey(" alfamart "), "ALFAMART");
    assert.strictEqual(normalizeStoreBrandKey("lawson"), "LAWSON");
    assert.strictEqual(normalizeStoreBrandKey("other"), "OTHER");
    assert.strictEqual(normalizeStoreBrandKey(null), "OTHER");
});

test("shouldShowStoreOwnershipSelect only returns true for Alfamart", () => {
    assert.strictEqual(shouldShowStoreOwnershipSelect("ALFAMART"), true);
    assert.strictEqual(shouldShowStoreOwnershipSelect(" alfamart "), true);
    assert.strictEqual(shouldShowStoreOwnershipSelect("LAWSON"), false);
    assert.strictEqual(shouldShowStoreOwnershipSelect(""), false);
});

test("normalizeStoreOwnershipForBrand persists Alfamart selected ownership", () => {
    assert.strictEqual(
        normalizeStoreOwnershipForBrand("ALFAMART", "FRANCHISE"),
        "FRANCHISE",
    );
    assert.strictEqual(
        normalizeStoreOwnershipForBrand("ALFAMART", "REGULAR"),
        "REGULAR",
    );
    assert.strictEqual(
        normalizeStoreOwnershipForBrand("ALFAMART", undefined),
        "REGULAR",
    );
});

test("normalizeStoreOwnershipForBrand normalizes non-Alfamart brands", () => {
    assert.strictEqual(
        normalizeStoreOwnershipForBrand("LAWSON", "FRANCHISE"),
        "REGULAR",
    );
    assert.strictEqual(
        normalizeStoreOwnershipForBrand("OTHER", "FRANCHISE"),
        "UNKNOWN",
    );
    assert.strictEqual(
        normalizeStoreOwnershipForBrand(null, "REGULAR"),
        "UNKNOWN",
    );
});

test("getStoreOwnershipFormValue maps unknown edit values to Regular", () => {
    assert.strictEqual(getStoreOwnershipFormValue("FRANCHISE"), "FRANCHISE");
    assert.strictEqual(getStoreOwnershipFormValue("REGULAR"), "REGULAR");
    assert.strictEqual(getStoreOwnershipFormValue("UNKNOWN"), "REGULAR");
    assert.strictEqual(getStoreOwnershipFormValue(null), "REGULAR");
});
