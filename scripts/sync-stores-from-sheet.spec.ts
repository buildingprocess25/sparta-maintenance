import assert from "node:assert/strict";
import {
    filterNewStores,
    parseStoreSheetRows,
} from "./sync-stores-from-sheet";

const stores = parseStoreSheetRows([
    ["Nama Toko", "Cabang", "Kode Toko"],
    ["Toko Satu", "SIDOARJO", "u001"],
    ["Toko Dua", "MALANG", "U002"],
    ["Toko Dua", "MALANG", "U002"],
    ["", "", ""],
]);

assert.deepEqual(stores, [
    { code: "U001", name: "Toko Satu", branchName: "SIDOARJO" },
    { code: "U002", name: "Toko Dua", branchName: "MALANG" },
]);

assert.deepEqual(filterNewStores(stores, new Set(["U001"])), [
    { code: "U002", name: "Toko Dua", branchName: "MALANG" },
]);

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Kode Toko", "Nama Toko", "Cabang"],
            ["U003", "", "TEGAL"],
        ]),
    /Baris 2 tidak lengkap/,
);

assert.throws(
    () =>
        parseStoreSheetRows([
            ["Kode Toko", "Nama Toko", "Cabang"],
            ["U004", "Toko Lama", "TEGAL"],
            ["U004", "Toko Baru", "TEGAL"],
        ]),
    /Kode toko duplikat U004/,
);

console.log("sync-stores-from-sheet tests passed");
