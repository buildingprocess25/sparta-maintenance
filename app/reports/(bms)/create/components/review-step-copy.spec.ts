import assert from "node:assert/strict";
import { getAfterSubmitSteps } from "./review-step-copy";

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "" },
    { handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "Rekanan" },
    { handler: "Rekanan" },
  ]),
  [
    'Status laporan menjadi "Review Checklist".',
    "BMC melakukan review checklist.",
    "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
  ],
);

assert.deepEqual(
  getAfterSubmitSteps([
    { handler: "Rekanan" },
    { handler: "BMS" },
  ]),
  [
    'Status laporan menjadi "Menunggu Persetujuan Estimasi".',
    "BMC melakukan review estimasi dan checklist.",
    "Jika disetujui, BMS dapat mulai pekerjaan.",
  ],
);

console.log("review step copy tests passed");
