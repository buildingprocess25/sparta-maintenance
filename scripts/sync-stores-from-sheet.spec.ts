import assert from "node:assert/strict";
import {
    buildStoreSyncChanges,
    filterNewStores,
    parseCoordinateCell,
    parseOwnershipMarker,
    parseStoreSheetRows,
} from "./sync-stores-from-sheet";

const stores = parseStoreSheetRows([
    ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
    ["SIDOARJO", "u001", "Toko Satu", "R", "-6.123456 106.123456"],
    ["MALANG", "U002", "Toko Dua", "F", "-7,123456 107,123456"],
    ["MALANG", "U002", "Toko Dua", "F", "-7,123456 107,123456"],
    ["", "", "", "", ""],
]);

assert.deepEqual(stores, [
    {
        code: "U001",
        name: "Toko Satu",
        branchName: "SIDOARJO",
        brand: "ALFAMART",
        ownershipType: "REGULAR",
        latitude: "-6.123456",
        longitude: "106.123456",
        hasValidCoordinates: true,
    },
    {
        code: "U002",
        name: "Toko Dua",
        branchName: "MALANG",
        brand: "ALFAMART",
        ownershipType: "FRANCHISE",
        latitude: "-7.123456",
        longitude: "107.123456",
        hasValidCoordinates: true,
    },
]);

assert.equal(parseOwnershipMarker("R"), "REGULAR");
assert.equal(parseOwnershipMarker("F"), "FRANCHISE");
assert.equal(parseOwnershipMarker(""), "UNKNOWN");
assert.equal(parseOwnershipMarker("x"), "UNKNOWN");

assert.deepEqual(parseCoordinateCell("-6.1 106.2"), {
    latitude: "-6.100000",
    longitude: "106.200000",
    hasValidCoordinates: true,
});
assert.deepEqual(parseCoordinateCell(""), {
    latitude: null,
    longitude: null,
    hasValidCoordinates: false,
});
assert.deepEqual(parseCoordinateCell("invalid"), {
    latitude: null,
    longitude: null,
    hasValidCoordinates: false,
});

assert.deepEqual(filterNewStores(stores, new Set(["U001"])), [stores[1]]);

const changes = buildStoreSyncChanges(stores, [
    {
        code: "U001",
        name: "Toko Lama",
        branchName: "SIDOARJO",
        brand: null,
        ownershipType: "UNKNOWN",
        latitude: null,
        longitude: null,
    },
    {
        code: "U002",
        name: "Toko Dua",
        branchName: "MALANG",
        brand: "ALFAMART",
        ownershipType: "FRANCHISE",
        latitude: "-7.123456",
        longitude: "107.123456",
    },
    {
        code: "LAW1",
        name: "Lawson Existing",
        branchName: "JAKARTA",
        brand: "LAWSON",
        ownershipType: "UNKNOWN",
        latitude: null,
        longitude: null,
    },
]);

assert.deepEqual(changes.creates, []);
assert.deepEqual(changes.updates, [
    {
        code: "U001",
        data: {
            name: "Toko Satu",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
    },
]);
assert.deepEqual(changes.summary, {
    created: 0,
    updated: 1,
    unchanged: 1,
    skipped: 1,
    updatedFields: {
        name: 1,
        brand: 1,
        ownershipType: 1,
        coordinates: 1,
    },
});

const invalidCoordinateChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["SIDOARJO", "U003", "Toko Tiga", "R", "invalid"],
    ]),
    [
        {
            code: "U003",
            name: "Toko Tiga",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.000000",
            longitude: "106.000000",
        },
    ],
);
assert.deepEqual(invalidCoordinateChanges.updates, []);
assert.equal(invalidCoordinateChanges.summary.unchanged, 1);

const lowerCaseDbCodeChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["SIDOARJO", "U005", "Toko Lima", "R", "-6.500000 106.500000"],
    ]),
    [
        {
            code: "u005",
            name: "Toko Lima Lama",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.500000",
            longitude: "106.500000",
        },
    ],
);
assert.equal(lowerCaseDbCodeChanges.updates[0]?.code, "u005");

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
            ["TEGAL", "U003", "", "R", "-6.1 106.2"],
        ]),
    /Baris 2 tidak lengkap/,
);

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
            ["TEGAL", "U004", "Toko Lama", "R", "-6.1 106.2"],
            ["TEGAL", "U004", "Toko Baru", "R", "-6.1 106.2"],
        ]),
    /Kode toko duplikat U004/,
);

// Test: branchName in DB must NOT be overwritten on update
const branchLockChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["CILEUNGSI_2", "U001", "Toko Satu", "R", "-6.123456 106.123456"],
    ]),
    [
        {
            code: "U001",
            name: "Toko Satu",
            branchName: "CILEUNGSI",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
    ],
);
// Sheet says CILEUNGSI_2 but DB has CILEUNGSI → must be unchanged (branchName locked)
assert.equal(branchLockChanges.summary.updated, 0);
assert.equal(branchLockChanges.summary.unchanged, 1);

// Test: update payload must NOT contain branchName
const updatePayloadChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["CILEUNGSI_2", "U001", "Toko Baru", "R", "-6.123456 106.123456"],
    ]),
    [
        {
            code: "U001",
            name: "Toko Lama",
            branchName: "CILEUNGSI",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
    ],
);
assert.equal(updatePayloadChanges.summary.updated, 1);
assert.ok(
    !("branchName" in (updatePayloadChanges.updates[0]?.data ?? {})),
    "branchName must not be in update payload",
);

// Test: updatedFields breakdown — only name changed
assert.deepEqual(updatePayloadChanges.summary.updatedFields, { name: 1 });

// Test: updatedFields with coordinate change
const coordChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["SIDOARJO", "U001", "Toko Satu", "R", "-6.999999 106.999999"],
    ]),
    [
        {
            code: "U001",
            name: "Toko Satu",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
    ],
);
assert.deepEqual(coordChanges.summary.updatedFields, { coordinates: 1 });

// Test: updatedFields with multiple field types across multiple stores
const multiChanges = buildStoreSyncChanges(
    parseStoreSheetRows([
        ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
        ["SIDOARJO", "U001", "Toko Baru A", "F", "-6.123456 106.123456"],
        ["MALANG", "U002", "Toko Dua", "R", "-7.999999 107.999999"],
    ]),
    [
        {
            code: "U001",
            name: "Toko Lama A",
            branchName: "SIDOARJO",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-6.123456",
            longitude: "106.123456",
        },
        {
            code: "U002",
            name: "Toko Dua",
            branchName: "MALANG",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            latitude: "-7.123456",
            longitude: "107.123456",
        },
    ],
);
assert.deepEqual(multiChanges.summary.updatedFields, {
    name: 1,
    ownershipType: 1,
    coordinates: 1,
});

console.log("branchName lock and updatedFields tests passed");
console.log("sync-stores-from-sheet tests passed");
