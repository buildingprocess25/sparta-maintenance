import assert from "node:assert/strict";
import {
    buildReportDetailModel,
    type RawReportDetailInput,
} from "./detail-data";
import { parseUrlList } from "@/lib/storage/photo-url";

const input: RawReportDetailInput = {
    reportNumber: "U845-2606-001",
    storeName: "KPG. TIMOR RAYA KM10",
    storeCode: "U845",
    branchName: "SIDOARJO",
    status: "PENDING_REVIEW",
    totalEstimation: 75000,
    totalReal: null,
    createdAt: "2026-06-02T01:00:00.000Z",
    updatedAt: "2026-06-02T02:00:00.000Z",
    lastActivityAt: "2026-06-02T02:00:00.000Z",
    finishedAt: null,
    pjumExportedAt: null,
    submittedBy: {
        name: "Marlion Metta",
        nik: "24115397",
    },
    items: [
        {
            itemId: "I1",
            itemName: "Checklist akhir",
            categoryName: "I. Preventif",
            condition: "BAIK",
            preventiveCondition: null,
            handler: null,
            images: [],
        },
        {
            itemId: "A1",
            itemName: "Lampu display",
            categoryName: "A. Area Sales",
            condition: "RUSAK",
            preventiveCondition: null,
            handler: "BMS",
            images: ["https://example.com/before.jpg"],
            notes: "Mati total",
            afterImages: ["https://example.com/after.jpg"],
            receiptImages: ["https://example.com/receipt.jpg"],
            realisasiItems: [
                {
                    materialName: "Lampu LED",
                    quantity: 1,
                    unit: "pcs",
                    price: 65000,
                    totalPrice: 65000,
                },
            ],
            discountAmount: 5000,
            completionNotes: "Sudah diganti",
        },
        {
            itemId: "B1",
            itemName: "Rak promosi",
            categoryName: "B. Area Sales",
            condition: "BAIK",
            preventiveCondition: null,
            handler: null,
            images: [],
        },
        {
            itemId: "C1",
            itemName: "Nilai kosong",
            categoryName: "C. Area Kosong",
            condition: null,
            preventiveCondition: null,
            handler: null,
            images: [],
        },
        {
            itemId: "D1",
            itemName: "Pekerjaan rekanan",
            categoryName: "D. Rekanan",
            condition: "RUSAK",
            preventiveCondition: null,
            handler: "REKANAN",
            images: [],
        },
    ],
    estimations: [
        {
            itemId: "A1",
            materialName: "Lampu LED",
            quantity: 1,
            unit: "pcs",
            price: 75000,
            totalPrice: 75000,
        },
    ],
    startSelfieUrls: [],
    startReceiptUrls: [],
    startMaterialStores: [],
    completionAdditionalPhotos: [],
    completionAdditionalNote: null,
    completedPdfPath: null,
    reportFinalDriveUrl: null,
    revisedPdfDriveUrl: null,
    revisedPdfFolderUrl: null,
    fullPdfDriveUrl: null,
    approvalLogs: [],
    activities: [],
    pjumExport: null,
};

const model = buildReportDetailModel(input);

assert.equal(model.summary.issueCount, 2);
assert.equal(model.checklistGroups.length, 5);
assert.deepEqual(
    model.checklistGroups.map((group) => group.categoryName),
    ["A. Area Sales", "B. Area Sales", "C. Area Kosong", "D. Rekanan", "I. Preventif"],
);
assert.equal(model.checklistGroups[2].rows[0].conditionLabel, "");
assert.equal(model.workItems.length, 1);
assert.equal(model.workItems[0].itemId, "A1");
assert.equal(model.workItems[0].estimationTotal, 75000);
assert.equal(model.workItems[0].realisasiTotal, 60000);
assert.equal(model.workItems[0].delta, -15000);
assert.equal(model.totals.realization, 60000);
assert.equal(model.photos.some((photo) => photo.conditionLabel === "Rusak"), true);
assert.equal(
    model.photos.some(
        (photo) =>
            photo.source === "Foto selesai" &&
            photo.conditionLabel === "Diperbaiki",
    ),
    true,
);
assert.deepEqual(parseUrlList('["https://example.com/a.jpg", ""]'), [
    "https://example.com/a.jpg",
]);

console.log("detail-data tests passed");
