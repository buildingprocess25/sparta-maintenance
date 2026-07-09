import assert from "node:assert/strict";

import { getStartWorkEvidenceError } from "./start-work-evidence";

assert.equal(
    getStartWorkEvidenceError({
        isZeroCost: false,
        skipPhotos: false,
        selfieCount: 0,
        materialStorePhotoCount: 1,
        receiptCount: 1,
        materialStores: [{ name: "Toko Material", city: "Serang" }],
    }),
    "Foto selfie bersama pejabat toko wajib diunggah",
);

assert.equal(
    getStartWorkEvidenceError({
        isZeroCost: false,
        skipPhotos: false,
        selfieCount: 1,
        materialStorePhotoCount: 1,
        receiptCount: 1,
        materialStores: [{ name: "Toko Material", city: "Serang" }],
    }),
    null,
);

assert.equal(
    getStartWorkEvidenceError({
        isZeroCost: true,
        skipPhotos: true,
        selfieCount: 0,
        materialStorePhotoCount: 0,
        receiptCount: 0,
        materialStores: [],
    }),
    null,
);

assert.equal(
    getStartWorkEvidenceError({
        isZeroCost: false,
        skipPhotos: false,
        selfieCount: 1,
        materialStorePhotoCount: 1,
        receiptCount: 1,
        materialStores: [{ name: "Toko Material", city: "" }],
    }),
    "Semua toko material harus memiliki nama dan alamat",
);

assert.equal(
    getStartWorkEvidenceError({
        isZeroCost: false,
        skipPhotos: true,
        selfieCount: 0,
        materialStorePhotoCount: 0,
        receiptCount: 0,
        materialStores: [],
    }),
    "Lewati foto hanya diperbolehkan jika total estimasi adalah Rp 0",
);

console.log("start-work evidence assertions passed");
