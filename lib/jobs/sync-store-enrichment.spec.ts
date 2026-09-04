import assert from "node:assert/strict";
import {
    buildStoreEnrichmentChanges,
    parseCoordinateCell,
    parseOwnershipMarker,
    parseStoreEnrichmentSheetRows,
} from "./sync-store-enrichment";

assert.deepEqual(parseOwnershipMarker("R"), {
    ownershipType: "REGULAR",
    warning: null,
});
assert.deepEqual(parseOwnershipMarker(" f "), {
    ownershipType: "FRANCHISE",
    warning: null,
});
assert.deepEqual(parseOwnershipMarker(""), {
    ownershipType: "UNKNOWN",
    warning: "empty ownership marker",
});
assert.deepEqual(parseOwnershipMarker("X"), {
    ownershipType: "UNKNOWN",
    warning: 'invalid ownership marker "X"',
});

assert.deepEqual(parseCoordinateCell("0.50954 101.4494"), {
    latitude: "0.509540",
    longitude: "101.449400",
    warning: null,
});
assert.deepEqual(parseCoordinateCell("-0.51995 102.92329"), {
    latitude: "-0.519950",
    longitude: "102.923290",
    warning: null,
});
assert.deepEqual(parseCoordinateCell(""), {
    latitude: null,
    longitude: null,
    warning: "empty coordinates",
});
assert.deepEqual(parseCoordinateCell("0.1"), {
    latitude: null,
    longitude: null,
    warning: 'invalid coordinates "0.1"',
});
assert.deepEqual(parseCoordinateCell("91 101"), {
    latitude: null,
    longitude: null,
    warning: 'coordinates out of range "91 101"',
});

const parsedRows = parseStoreEnrichmentSheetRows([
    ["Branch", "Kode Toko", "Nama Toko", "F/R", "Titik Koordinat"],
    ["PEKANBARU", "1a01", "JEND SUDIRMAN", "R", "0.50954 101.4494"],
    ["PEKANBARU", "1A0L", "JENSUD - ROHUL", "F", "1.028359 100.461891"],
    ["PEKANBARU", "1A0L", "JENSUD - ROHUL", "F", "1.028359 100.461891"],
    ["PEKANBARU", "1A0X", "CONFLICT A", "R", "0.1 100.1"],
    ["PEKANBARU", "1A0X", "CONFLICT B", "F", "0.1 100.1"],
    ["", "", "", "", ""],
]);

assert.deepEqual(parsedRows.stores, [
    {
        code: "1A01",
        branchName: "PEKANBARU",
        name: "JEND SUDIRMAN",
        ownershipType: "REGULAR",
        latitude: "0.509540",
        longitude: "101.449400",
    },
    {
        code: "1A0L",
        branchName: "PEKANBARU",
        name: "JENSUD - ROHUL",
        ownershipType: "FRANCHISE",
        latitude: "1.028359",
        longitude: "100.461891",
    },
]);
assert.equal(parsedRows.summary.sheetRowsRead, 5);
assert.equal(parsedRows.summary.validUniqueSheetCodes, 2);
assert.equal(parsedRows.summary.duplicateIdenticalRows, 1);
assert.deepEqual(parsedRows.summary.duplicateConflictCodes, ["1A0X"]);

const changes = buildStoreEnrichmentChanges(
    parsedRows.stores,
    [
        {
            code: "1A01",
            ownershipType: "UNKNOWN",
            latitude: null,
            longitude: null,
        },
        {
            code: "1A0L",
            ownershipType: "UNKNOWN",
            latitude: "9.000000",
            longitude: "109.000000",
        },
        {
            code: "ZZ99",
            ownershipType: "REGULAR",
            latitude: "1.000000",
            longitude: "2.000000",
        },
    ],
    { clearInvalidCoordinates: false, resetMissingOwnershipToUnknown: true },
);

assert.deepEqual(changes.updates, [
    {
        code: "1A01",
        ownershipType: "REGULAR",
        latitude: "0.509540",
        longitude: "101.449400",
    },
    {
        code: "1A0L",
        ownershipType: "FRANCHISE",
        latitude: "1.028359",
        longitude: "100.461891",
    },
    {
        code: "ZZ99",
        ownershipType: "UNKNOWN",
    },
]);
assert.deepEqual(changes.summary, {
    storesUpdated: 3,
    storesUnchanged: 0,
    sheetCodesNotFoundInDatabase: 0,
    databaseStoresNotFoundInSheet: 1,
});

console.log("sync-store-enrichment tests passed");
