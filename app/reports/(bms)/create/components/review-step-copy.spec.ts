import assert from "node:assert/strict";
import { getAfterSubmitSteps } from "./review-step-copy";

assert.deepEqual(
  getAfterSubmitSteps([
    { condition: "baik", handler: "" },
    { condition: "rusak", handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { condition: "rusak", handler: "Rekanan" },
    { condition: "rusak", handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { condition: "rusak", handler: "Rekanan" },
    { condition: "rusak", handler: "BMS" },
  ]),
  [
    'Status laporan menjadi "Menunggu Persetujuan Estimasi".',
    "BMC melakukan review estimasi dan checklist.",
    "Jika disetujui, BMS dapat mulai pekerjaan.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { condition: "baik", handler: "BMS" },
    { condition: "rusak", handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

console.log("review step copy tests passed");
