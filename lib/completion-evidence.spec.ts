import assert from "node:assert/strict";

import { getCompletionEvidenceErrors } from "./completion-evidence";

const validItem = {
    itemId: "A1",
    itemName: "Bahu Jalan",
    afterPhotoCount: 1,
    realisasiEntries: [
        {
            materialName: "Semen",
            quantity: 2,
            price: 50000,
        },
    ],
    discountAmount: 0,
};

assert.deepEqual(getCompletionEvidenceErrors([validItem]), []);

assert.deepEqual(
    getCompletionEvidenceErrors([{ ...validItem, afterPhotoCount: 0 }]),
    [
        {
            itemId: "A1",
            message: "Foto sesudah wajib diisi",
            description: "Item: Bahu Jalan",
        },
    ]
);

assert.deepEqual(
    getCompletionEvidenceErrors([
        {
            ...validItem,
            realisasiEntries: [{ materialName: " ", quantity: 1, price: null }],
        },
    ]),
    [
        {
            itemId: "A1",
            message:
                "Semua baris realisasi harus memiliki nama barang, jumlah > 0, dan harga aktual",
            description: "Item: Bahu Jalan",
        },
    ]
);

assert.deepEqual(
    getCompletionEvidenceErrors([{ ...validItem, discountAmount: 200000 }]),
    [
        {
            itemId: "A1",
            message: "Potongan harga tidak boleh lebih besar dari total item",
            description: "Item: Bahu Jalan",
        },
    ]
);
