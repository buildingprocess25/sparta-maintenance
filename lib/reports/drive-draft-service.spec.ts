import assert from "node:assert/strict";

import {
  promoteDriveDraft,
  reserveDriveDraft,
  type DriveDraftRepository,
} from "./drive-draft-service";

class FakeDraftRepository implements DriveDraftRepository {
  stores = new Map([
    ["Q001", { code: "Q001", name: "ALFAMART A", branchName: "BALI" }],
    ["Q002", { code: "Q002", name: "ALFAMART B", branchName: "BALI" }],
    ["X001", { code: "X001", name: "ALFAMART X", branchName: "CIANJUR" }],
  ]);
  drafts = new Map<
    string,
    { reportNumber: string; bmsNIK: string; branchName: string; storeCode: string; storeName: string }
  >();
  created: Array<{ reportNumber: string; storeCode: string; bmsNIK: string }> = [];
  deleted: Array<{ reportNumber: string; bmsNIK: string }> = [];
  updated: Array<{ reportNumber: string; bmsNIK: string; status: string }> = [];
  sequence = 1;

  async findStore(storeCode: string) {
    return this.stores.get(storeCode) ?? null;
  }

  async findDraftByUser(bmsNIK: string) {
    return [...this.drafts.values()].find((draft) => draft.bmsNIK === bmsNIK) ?? null;
  }

  async findDraftForPromotion(reportNumber: string, bmsNIK: string) {
    const draft = this.drafts.get(reportNumber);
    return draft && draft.bmsNIK === bmsNIK ? draft : null;
  }

  async generateReportNumber(storeCode: string) {
    return `${storeCode}-2608-${String(this.sequence++).padStart(3, "0")}`;
  }

  async createDraft(input: {
    reportNumber: string;
    bmsNIK: string;
    branchName: string;
    storeCode: string;
    storeName: string;
  }) {
    this.created.push({
      reportNumber: input.reportNumber,
      storeCode: input.storeCode,
      bmsNIK: input.bmsNIK,
    });
    this.drafts.set(input.reportNumber, input);
  }

  async deleteDraft(reportNumber: string, bmsNIK: string) {
    this.deleted.push({ reportNumber, bmsNIK });
    const draft = this.drafts.get(reportNumber);
    if (draft?.bmsNIK === bmsNIK) {
      this.drafts.delete(reportNumber);
    }
  }

  async promoteDraft(input: {
    reportNumber: string;
    bmsNIK: string;
    status: string;
  }) {
    this.updated.push({
      reportNumber: input.reportNumber,
      bmsNIK: input.bmsNIK,
      status: input.status,
    });
    this.drafts.delete(input.reportNumber);
  }
}

async function run() {
const fakeRepo = new FakeDraftRepository();
const first = await reserveDriveDraft(fakeRepo, {
  bmsNIK: "111",
  branchName: "BALI",
  storeCode: "Q001",
});
const second = await reserveDriveDraft(fakeRepo, {
  bmsNIK: "111",
  branchName: "BALI",
  storeCode: "Q001",
});
assert.equal(first.reportNumber, second.reportNumber);
assert.equal(fakeRepo.created.length, 1);

const replacement = await reserveDriveDraft(fakeRepo, {
  bmsNIK: "111",
  branchName: "BALI",
  storeCode: "Q002",
});
assert.equal(replacement.reportNumber, "Q002-2608-002");
assert.deepEqual(fakeRepo.deleted, [{ reportNumber: first.reportNumber, bmsNIK: "111" }]);
assert.equal(fakeRepo.created.length, 2);

await assert.rejects(
  reserveDriveDraft(fakeRepo, {
    bmsNIK: "111",
    branchName: "BALI",
    storeCode: "X001",
  }),
  /tidak berada di cabang BALI/,
);

await assert.rejects(
  promoteDriveDraft(fakeRepo, {
    reportNumber: replacement.reportNumber,
    bmsNIK: "222",
    status: "PENDING_ESTIMATION",
    items: [],
    estimations: [],
    totalEstimation: 0,
    drivePhotoFileIds: [],
  }),
  /Draft laporan tidak ditemukan/,
);

await promoteDriveDraft(fakeRepo, {
  reportNumber: replacement.reportNumber,
  bmsNIK: "111",
  status: "PENDING_ESTIMATION",
  items: [],
  estimations: [],
  totalEstimation: 0,
  drivePhotoFileIds: [],
});
assert.equal(fakeRepo.created.length, 2);
assert.deepEqual(fakeRepo.updated[0], {
  reportNumber: replacement.reportNumber,
  bmsNIK: "111",
  status: "PENDING_ESTIMATION",
});
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
