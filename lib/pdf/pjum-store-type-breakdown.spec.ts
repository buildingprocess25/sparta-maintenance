import test from "node:test";
import * as assert from "node:assert";
import {
    getPjumStoreTypeBreakdown,
    resolvePjumStoreTypeCategory,
} from "./pjum-store-type-breakdown";

test("resolvePjumStoreTypeCategory maps known brands and ownership values", () => {
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "ALFAMART",
            ownershipType: "REGULAR",
        }).label,
        "Alfamart Reguler",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "alfamart",
            ownershipType: "FRANCHISE",
        }).label,
        "Alfamart Franchise",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "LAWSON",
            ownershipType: "REGULAR",
        }).label,
        "Lawson",
    );
});

test("resolvePjumStoreTypeCategory keeps Alfamart unknown explicit", () => {
    const category = resolvePjumStoreTypeCategory({
        brand: "ALFAMART",
        ownershipType: "UNKNOWN",
    });

    assert.strictEqual(category.key, "ALFAMART_UNKNOWN");
    assert.strictEqual(category.label, "Alfamart - Tipe Toko Belum Diketahui");
});

test("resolvePjumStoreTypeCategory treats missing or unrecognized store metadata as unknown Alfamart", () => {
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: null,
            ownershipType: null,
        }).key,
        "ALFAMART_UNKNOWN",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "OTHER",
            ownershipType: "REGULAR",
        }).key,
        "ALFAMART_UNKNOWN",
    );
});

test("getPjumStoreTypeBreakdown suppresses breakdown for one category", () => {
    const result = getPjumStoreTypeBreakdown([
        {
            reportNumber: "M001-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 100_000,
        },
        {
            reportNumber: "M002-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 50_000,
        },
    ]);

    assert.strictEqual(result.shouldRenderBreakdown, false);
    assert.strictEqual(result.groups.length, 1);
    assert.strictEqual(result.groups[0].subtotal, 150_000);
});

test("getPjumStoreTypeBreakdown orders and totals mixed categories", () => {
    const result = getPjumStoreTypeBreakdown([
        {
            reportNumber: "F001-2609-001",
            brand: "ALFAMART",
            ownershipType: "FRANCHISE",
            totalRealisasi: 25_000,
        },
        {
            reportNumber: "L001-2609-001",
            brand: "LAWSON",
            ownershipType: "REGULAR",
            totalRealisasi: 75_000,
        },
        {
            reportNumber: "R001-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 100_000,
        },
        {
            reportNumber: "U001-2609-001",
            brand: "ALFAMART",
            ownershipType: "UNKNOWN",
            totalRealisasi: 10_000,
        },
    ]);

    assert.strictEqual(result.shouldRenderBreakdown, true);
    assert.deepStrictEqual(
        result.groups.map((group) => group.label),
        [
            "Alfamart Reguler",
            "Alfamart Franchise",
            "Lawson",
            "Alfamart - Tipe Toko Belum Diketahui",
        ],
    );
    assert.deepStrictEqual(
        result.groups.map((group) => group.subtotal),
        [100_000, 25_000, 75_000, 10_000],
    );
});
