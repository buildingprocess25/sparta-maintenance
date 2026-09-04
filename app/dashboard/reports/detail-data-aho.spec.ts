import assert from "node:assert/strict";
import {
    buildReportDetailModel,
    type RawReportDetailInput,
} from "./[reportNumber]/_lib/detail-data";

const input: RawReportDetailInput = {
    reportNumber: "U845-2606-001",
    storeName: "KPG. TIMOR RAYA KM10",
    storeCode: "U845",
    branchName: "SIDOARJO",
    status: "PENDING_REVIEW",
    totalEstimation: 0,
    totalReal: null,
    createdAt: "2026-06-02T01:00:00.000Z",
    updatedAt: "2026-06-02T02:00:00.000Z",
    lastActivityAt: "2026-06-02T02:00:00.000Z",
    finishedAt: null,
    pjumExportedAt: null,
    submittedBy: { name: "Marlion Metta", nik: "24115397" },
    items: [
        {
            itemId: "A1",
            condition: "RUSAK",
            preventiveCondition: null,
            handler: "BMS",
            ahoTicketNumber: "AHO-001",
        },
    ],
    estimations: [],
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

const row = buildReportDetailModel(input).checklistGroups[0]?.rows[0];

assert.equal(row?.itemName, "Bahu Jalan");
assert.equal(row?.ahoTicketNumber, "AHO-001");

console.log("dashboard report AHO tests passed");
