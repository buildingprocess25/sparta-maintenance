import assert from "node:assert/strict";

import type { DriveFolder, DriveFolderGateway } from "./folder-gateway";
import {
  ensureEvidenceFolder,
  ensurePjumMonthFolder,
  ensureReportDocumentFolder,
  resolveStoreFolder,
  type DriveFolderCache,
} from "./hierarchy-service";

class FakeGateway implements DriveFolderGateway {
  folders = new Map<string, DriveFolder>();
  children = new Map<string, string[]>();
  creates: Array<{ parentId: string; name: string; id: string }> = [];
  renames: Array<{ id: string; name: string }> = [];

  constructor(folders: Array<{ id: string; name: string; parentId?: string }>) {
    for (const folder of folders) {
      const parentIds = folder.parentId ? [folder.parentId] : [];
      this.folders.set(folder.id, { id: folder.id, name: folder.name, parentIds });
      if (folder.parentId) {
        const current = this.children.get(folder.parentId) ?? [];
        current.push(folder.id);
        this.children.set(folder.parentId, current);
      }
    }
  }

  async listChildFolders(parentId: string): Promise<DriveFolder[]> {
    return (this.children.get(parentId) ?? []).map((id) => this.folders.get(id)!);
  }

  async getFolder(folderId: string): Promise<DriveFolder | null> {
    return this.folders.get(folderId) ?? null;
  }

  async createFolder(parentId: string, name: string): Promise<DriveFolder> {
    const id = `created-${this.creates.length + 1}`;
    const folder = { id, name, parentIds: [parentId] };
    this.folders.set(id, folder);
    this.children.set(parentId, [...(this.children.get(parentId) ?? []), id]);
    this.creates.push({ parentId, name, id });
    return folder;
  }

  async renameFolder(folderId: string, name: string): Promise<void> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error(`Folder ${folderId} not found`);
    this.folders.set(folderId, { ...folder, name });
    this.renames.push({ id: folderId, name });
  }
}

class FakeCache implements DriveFolderCache {
  values = new Map<string, string>();
  upserts: Array<{ key: string; folderId: string }> = [];
  deletes: string[] = [];

  async get(cacheKey: string): Promise<string | null> {
    return this.values.get(cacheKey) ?? null;
  }

  async upsert(cacheKey: string, folderId: string): Promise<void> {
    this.values.set(cacheKey, folderId);
    this.upserts.push({ key: cacheKey, folderId });
  }

  async delete(cacheKey: string): Promise<void> {
    this.values.delete(cacheKey);
    this.deletes.push(cacheKey);
  }
}

function deps(gateway: FakeGateway, cache = new FakeCache()) {
  return { gateway, cache };
}

function baseGateway(extra: Array<{ id: string; name: string; parentId?: string }> = []) {
  return new FakeGateway([
    { id: "root", name: "DOKUMEN SPARTA" },
    { id: "branch-bali", name: "BALI", parentId: "root" },
    { id: "toko-bali", name: "Toko", parentId: "branch-bali" },
    ...extra,
  ]);
}

async function run() {
const byCodeGateway = baseGateway([
  {
    id: "store-code-match",
    name: "ULOK-1 - DRIVE NAME - Q001",
    parentId: "toko-bali",
  },
  { id: "maintenance-code", name: "Maintenance", parentId: "store-code-match" },
]);
const byCode = await resolveStoreFolder(deps(byCodeGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "DB NAME",
});
assert.equal(byCode.storeFolderId, "store-code-match");
assert.equal(byCode.maintenanceFolderId, "maintenance-code");
assert.equal(byCode.repairedStoreCode, false);
assert.equal(byCodeGateway.renames.length, 0);

const nameFallbackGateway = baseGateway([
  {
    id: "store-name-match",
    name: "ULOK-1 - ALFAMART SUDIRMAN - -",
    parentId: "toko-bali",
  },
]);
const repaired = await resolveStoreFolder(deps(nameFallbackGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "Alfamart  Sudirman",
});
assert.equal(repaired.storeFolderId, "store-name-match");
assert.equal(repaired.repairedStoreCode, true);
assert.deepEqual(nameFallbackGateway.renames[0], {
  id: "store-name-match",
  name: "ULOK-1 - ALFAMART SUDIRMAN - Q001",
});
assert.deepEqual(nameFallbackGateway.creates[0], {
  parentId: "store-name-match",
  name: "Maintenance",
  id: "created-1",
});

const wrongCodeGateway = baseGateway([
  {
    id: "store-wrong-code",
    name: "ULOK-9 - ALFAMART SUDIRMAN - X999",
    parentId: "toko-bali",
  },
]);
await resolveStoreFolder(deps(wrongCodeGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "ALFAMART SUDIRMAN",
});
assert.deepEqual(wrongCodeGateway.renames[0], {
  id: "store-wrong-code",
  name: "ULOK-9 - ALFAMART SUDIRMAN - Q001",
});

const createdGateway = baseGateway();
const created = await resolveStoreFolder(deps(createdGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q002",
  storeName: "ALFAMART BARU",
});
assert.equal(created.createdStoreFolder, true);
assert.deepEqual(createdGateway.creates[0], {
  parentId: "toko-bali",
  name: "BELUM DIISI - ALFAMART BARU - Q002",
  id: "created-1",
});
assert.deepEqual(createdGateway.creates[1], {
  parentId: "created-1",
  name: "Maintenance",
  id: "created-2",
});

const duplicateCodeGateway = baseGateway([
  { id: "store-a", name: "ULOK-1 - A - Q001", parentId: "toko-bali" },
  { id: "store-b", name: "ULOK-2 - B - Q001", parentId: "toko-bali" },
]);
await assert.rejects(
  resolveStoreFolder(deps(duplicateCodeGateway), {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "A",
  }),
  /Ambiguous Drive store folder code match/,
);
assert.equal(duplicateCodeGateway.creates.length, 0);

const duplicateNameGateway = baseGateway([
  { id: "store-a", name: "ULOK-1 - ALFAMART A - -", parentId: "toko-bali" },
  { id: "store-b", name: "ULOK-2 - ALFAMART  A - -", parentId: "toko-bali" },
]);
await assert.rejects(
  resolveStoreFolder(deps(duplicateNameGateway), {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
  }),
  /Ambiguous Drive store folder name match/,
);
assert.equal(duplicateNameGateway.creates.length, 0);

const missingBranchGateway = new FakeGateway([{ id: "root", name: "DOKUMEN SPARTA" }]);
await assert.rejects(
  resolveStoreFolder(deps(missingBranchGateway), {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
  }),
  /Branch folder 'BALI' not found/,
);
assert.equal(missingBranchGateway.creates.length, 0);

const missingTokoGateway = new FakeGateway([
  { id: "root", name: "DOKUMEN SPARTA" },
  { id: "branch-bali", name: "BALI", parentId: "root" },
]);
await assert.rejects(
  resolveStoreFolder(deps(missingTokoGateway), {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
  }),
  /Toko folder not found/,
);
assert.equal(missingTokoGateway.creates.length, 0);

const cacheGateway = byCodeGateway;
const cache = new FakeCache();
cache.values.set("DRIVE_STORE:root:bali:q001", "store-code-match");
const cached = await resolveStoreFolder(deps(cacheGateway, cache), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "DB NAME",
});
assert.equal(cached.storeFolderId, "store-code-match");
assert.equal(cache.deletes.length, 0);

const invalidCache = new FakeCache();
invalidCache.values.set("DRIVE_STORE:root:bali:q001", "branch-bali");
await resolveStoreFolder(deps(cacheGateway, invalidCache), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "DB NAME",
});
assert.deepEqual(invalidCache.deletes, ["DRIVE_STORE:root:bali:q001"]);

const evidenceGateway = baseGateway([
  { id: "store", name: "ULOK-1 - ALFAMART A - Q001", parentId: "toko-bali" },
  { id: "maintenance", name: "Maintenance", parentId: "store" },
]);
const evidenceId = await ensureEvidenceFolder(deps(evidenceGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "ALFAMART A",
  reportNumber: "Q001-2608-001",
  evidence: { kind: "START_SELFIE" },
});
assert.equal(evidenceId, "created-3");
assert.deepEqual(evidenceGateway.creates.map((create) => create.name), [
  "Q001-2608-001",
  "03 - Foto Mulai Pekerjaan",
  "01 - Selfie BMS",
]);

const documentId = await ensureReportDocumentFolder(deps(evidenceGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  storeCode: "Q001",
  storeName: "ALFAMART A",
  reportNumber: "Q001-2608-001",
});
assert.equal(evidenceGateway.folders.get(documentId)?.name, "01 - Dokumen");

const pjumGateway = baseGateway();
const pjumId = await ensurePjumMonthFolder(deps(pjumGateway), {
  rootFolderId: "root",
  branchName: "BALI",
  bmsNIK: "111",
  bmsName: "BMS User",
  year: 2026,
  monthName: "Agustus",
});
assert.equal(pjumGateway.folders.get(pjumId)?.name, "Agustus");
assert.deepEqual(pjumGateway.creates.map((create) => create.name), [
  "PJUM Sparta-Maintenance",
  "111 - BMS User",
  "2026",
  "Agustus",
]);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
