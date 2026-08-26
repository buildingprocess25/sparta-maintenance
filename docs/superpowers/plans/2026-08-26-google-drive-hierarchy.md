# Google Drive Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every new Sparta Maintenance photo, report PDF, revision PDF, and PJUM into the approved `DOKUMEN SPARTA` hierarchy while safely reusing and repairing existing store folders.

**Architecture:** Introduce a pure hierarchy policy and an injected Drive folder gateway, then build one server-side resolver used by both Google OAuth clients. Reserve a real `DRAFT` report number before the first checklist upload so every photo can go directly to its final report folder; existing PDF, revision, PJUM, cleanup, and CDN flows then consume the same resolver.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.9, Prisma 7/PostgreSQL, Google Drive API v3 (`googleapis`), Zod 4, Node assertion specs executed with `tsx`.

## Global Constraints

- `GOOGLE_DRIVE_ROOT_FOLDER_ID` is the canonical `DOKUMEN SPARTA` root after cutover.
- `DRIVE_CDN_ROOT_FOLDER_ID` is compatibility-only and must fall back to the canonical root.
- Database store code is authoritative; an exact code match wins over a different name match.
- Name fallback ignores case, outer whitespace, and repeated whitespace only; it is not fuzzy matching.
- Existing no-ulok and Drive store-name segments are preserved when correcting the final code segment.
- New store folders use `BELUM DIISI - <NAMA TOKO DB> - <KODE TOKO DB>`.
- Multiple code or normalized-name matches fail without rename, merge, or fallback creation.
- `Maintenance` is created beside `Building`; Building-owned content is never modified.
- Empty evidence category folders are not pre-created.
- Existing legacy files are not migrated or deleted in this implementation.
- `BACKUP_DRIVE_FOLDER_ID` remains independent and backup retention remains 10 files.
- No new third-party dependency is required.

---

## File Structure

- Create `lib/google-drive/hierarchy-policy.ts`: pure naming, parsing, normalization, evidence-path, PDF-name, and PJUM-path policy.
- Create `lib/google-drive/hierarchy-policy.spec.ts`: exhaustive pure policy assertions.
- Create `lib/google-drive/folder-gateway.ts`: small injected interface and Google API adapter for folder list/create/read/rename.
- Create `lib/google-drive/hierarchy-service.ts`: code-first store resolver, cache validation, and report/PJUM folder ensures.
- Create `lib/google-drive/hierarchy-service.spec.ts`: fake-gateway tests for resolution, ambiguity, rename, and cache behavior.
- Create `lib/google-drive/photo-upload-context.ts`: discriminated upload context schema and category authorization policy.
- Create `lib/google-drive/photo-upload-context.spec.ts`: schema and destination assertions.
- Create `lib/reports/drive-draft-service.ts`: injected report-draft reservation/promotion rules.
- Create `lib/reports/drive-draft-service.spec.ts`: fake-repository tests for draft reservation and promotion.
- Create `app/reports/actions/ensure-drive-draft.ts`: authenticated server action that reserves a report number before checklist upload.
- Modify `app/reports/actions/submit.ts`: promote the reserved DRAFT instead of creating a second report.
- Modify `app/reports/actions/draft.ts` and `app/reports/actions.ts`: expose discard behavior for reserved Drive drafts.
- Modify `lib/storage/drive-photo-service.ts`: upload to an explicit resolved parent folder and semantic filename.
- Modify `app/api/photos/upload/route.ts`: validate context, load authoritative report/store data, resolve destination, and upload.
- Create `app/api/photos/upload/route.spec.ts`: route-service contract assertions with injected dependencies.
- Modify `lib/hooks/use-photo-upload.ts`: require upload context in the shared client hook.
- Modify report create/start/completion upload call sites: provide report/category/item/material-store context.
- Modify `lib/google-drive/archive.ts`: use report and branch-level PJUM destinations from the hierarchy service.
- Modify `lib/pdf/snapshot-storage.ts`: stop building legacy final-report paths.
- Modify `app/dashboard/intervensi/revisi-laporan/actions.ts`: store revision PDF in `01 - Dokumen`.
- Modify `app/reports/pjum/approval-actions.ts`: use canonical report and PJUM upload functions.
- Modify `lib/jobs/cleanup-pending-reports.ts`: clean expired DRAFT photo IDs and rows.
- Modify `lib/google-drive/cdn-client.ts`: canonical-root fallback.
- Remove `lib/google-drive/photos.ts` after confirming no active imports; it encodes the obsolete post-approval photo archive path.
- Modify `docs/project/07-integrations-and-env.md` and `docs/project/08-operations.md`: document active hierarchy, env cutover, backup separation, and rollback.

### Task 1: Lock Pure Naming and Destination Policy

**Files:**
- Create: `lib/google-drive/hierarchy-policy.ts`
- Create: `lib/google-drive/hierarchy-policy.spec.ts`

**Interfaces:**
- Consumes: report/store/checklist/material-store metadata as strings and discriminated evidence kinds.
- Produces: `parseStoreFolderName`, `normalizeStoreIdentity`, `buildNewStoreFolderName`, `buildReportRelativePath`, `buildEvidenceRelativePath`, `buildFinalPdfName`, `buildRevisionPdfName`, and `buildPjumRelativePath`.

- [ ] **Step 1: Write failing policy assertions**

Create assertions covering sanitization, three-part folder parsing, code/name normalization, new-store naming, every evidence kind, report PDF names, and PJUM placement:

```ts
import assert from "node:assert/strict";
import {
    buildEvidenceRelativePath,
    buildFinalPdfName,
    buildNewStoreFolderName,
    buildPjumRelativePath,
    buildRevisionPdfName,
    normalizeStoreIdentity,
    parseStoreFolderName,
} from "./hierarchy-policy";

assert.deepEqual(
    parseStoreFolderName("QZO1-2207-0001 - ALFAMART  SUDIRMAN - -"),
    { noUlok: "QZO1-2207-0001", storeName: "ALFAMART  SUDIRMAN", storeCode: "-" },
);
assert.equal(normalizeStoreIdentity("  Alfamart  Sudirman "), "alfamart sudirman");
assert.equal(
    buildNewStoreFolderName({ storeName: "ALFAMART SUDIRMAN", storeCode: "Q001" }),
    "BELUM DIISI - ALFAMART SUDIRMAN - Q001",
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "CHECKLIST", categoryName: "A. Depan", itemId: "A1", itemName: "Bahu/Jalan" }),
    ["02 - Foto Checklist", "A. Depan", "A1 - Bahu-Jalan"],
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "START_SELFIE" }),
    ["03 - Foto Mulai Pekerjaan", "01 - Selfie BMS"],
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "START_MATERIAL_STORE", entryId: "store-1", index: 0, name: "TB Maju", city: "Cianjur" }),
    ["03 - Foto Mulai Pekerjaan", "03 - Toko Material", "01 - TB Maju - Cianjur"],
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "COMPLETION_RESULT", categoryName: "A. Depan", itemId: "A1", itemName: "Bahu Jalan" }),
    ["04 - Foto Penyelesaian", "01 - Hasil Pekerjaan", "A. Depan", "A1 - Bahu Jalan"],
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "COMPLETION_RECEIPT", itemId: "A1", itemName: "Bahu Jalan" }),
    ["04 - Foto Penyelesaian", "02 - Nota Realisasi", "A1 - Bahu Jalan"],
);
assert.deepEqual(
    buildEvidenceRelativePath({ kind: "COMPLETION_ADDITIONAL" }),
    ["04 - Foto Penyelesaian", "03 - Dokumentasi Tambahan"],
);
assert.equal(buildFinalPdfName("Q001-2608-001"), "Q001-2608-001 - Laporan Final.pdf");
assert.equal(buildRevisionPdfName("Q001-2608-001"), "Q001-2608-001 - Laporan Revisi.pdf");
assert.deepEqual(
    buildPjumRelativePath({ bmsNIK: "111", bmsName: "BMS User", year: 2026, monthName: "Agustus" }),
    ["PJUM Sparta-Maintenance", "111 - BMS User", "2026", "Agustus"],
);
```

- [ ] **Step 2: Run the policy spec and confirm the missing-module failure**

Run: `npx tsx lib/google-drive/hierarchy-policy.spec.ts`

Expected: FAIL with `Cannot find module './hierarchy-policy'`.

- [ ] **Step 3: Implement the pure policy**

Define the discriminated evidence type and exact exported functions:

```ts
export const MAINTENANCE_FOLDER = "Maintenance";
export const STORE_COLLECTION_FOLDER = "Toko";

export type EvidenceDestination =
    | { kind: "CHECKLIST"; categoryName: string; itemId: string; itemName: string }
    | { kind: "START_SELFIE" }
    | { kind: "START_RECEIPT" }
    | { kind: "START_MATERIAL_STORE"; entryId: string; index: number; name: string; city: string }
    | { kind: "COMPLETION_RESULT"; categoryName: string; itemId: string; itemName: string }
    | { kind: "COMPLETION_RECEIPT"; itemId: string; itemName: string }
    | { kind: "COMPLETION_ADDITIONAL" };

export function sanitizeDriveSegment(value: string): string {
    return value.replaceAll("/", "-").replaceAll("\\", "-").trim() || "-";
}

export function normalizeStoreIdentity(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export function parseStoreFolderName(name: string) {
    const parts = name.split(/\s+-\s+/);
    if (parts.length !== 3) return null;
    return { noUlok: parts[0]!.trim(), storeName: parts[1]!.trim(), storeCode: parts[2]!.trim() };
}

export function buildNewStoreFolderName(input: { storeName: string; storeCode: string }) {
    return `BELUM DIISI - ${sanitizeDriveSegment(input.storeName)} - ${sanitizeDriveSegment(input.storeCode)}`;
}
```

Implement `buildEvidenceRelativePath` as an exhaustive `switch`; `START_RECEIPT` maps to `03 - Foto Mulai Pekerjaan/02 - Nota Pembelian`, and reject negative material-store indexes.

- [ ] **Step 4: Run the pure policy spec**

Run: `npx tsx lib/google-drive/hierarchy-policy.spec.ts`

Expected: PASS with exit code 0.

- [ ] **Step 5: Commit the policy unit**

```bash
git add lib/google-drive/hierarchy-policy.ts lib/google-drive/hierarchy-policy.spec.ts
git commit -m "feat: define Drive hierarchy policy"
```

### Task 2: Build the Store Folder Resolver and Drive Gateway

**Files:**
- Create: `lib/google-drive/folder-gateway.ts`
- Create: `lib/google-drive/hierarchy-service.ts`
- Create: `lib/google-drive/hierarchy-service.spec.ts`
- Modify: `lib/google-drive/files.ts`

**Interfaces:**
- Consumes: `drive_v3.Drive`, canonical root ID, database cache adapter, branch/store/report metadata.
- Produces: `createGoogleFolderGateway`, `resolveStoreFolder`, `ensureReportFolder`, `ensureEvidenceFolder`, `ensureReportDocumentFolder`, and `ensurePjumMonthFolder`.

- [ ] **Step 1: Write fake-gateway resolver tests**

Use an in-memory gateway and assert exact code precedence, normalized name fallback, code replacement, new-folder naming, ambiguity failure, and Maintenance creation:

```ts
const byCode = await resolveStoreFolder(deps, {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "DB NAME",
});
assert.equal(byCode.storeFolderId, "store-code-match");
assert.equal(fake.renames.length, 0);

const repaired = await resolveStoreFolder(nameFallbackDeps, {
    rootFolderId: "root",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "Alfamart  Sudirman",
});
assert.deepEqual(fake.renames[0], {
    id: "store-name-match",
    name: "ULOK-1 - ALFAMART SUDIRMAN - Q001",
});

await assert.rejects(
    resolveStoreFolder(duplicateDeps, input),
    /Ambiguous Drive store folder code match/,
);
```

Also assert that a missing branch or missing `Toko` fails and creates nothing.

- [ ] **Step 2: Run the resolver spec and confirm failure**

Run: `npx tsx lib/google-drive/hierarchy-service.spec.ts`

Expected: FAIL because the gateway and service modules do not exist.

- [ ] **Step 3: Define the narrow gateway and Google adapter**

```ts
export type DriveFolder = { id: string; name: string; parentIds: string[] };

export interface DriveFolderGateway {
    listChildFolders(parentId: string): Promise<DriveFolder[]>;
    getFolder(folderId: string): Promise<DriveFolder | null>;
    createFolder(parentId: string, name: string): Promise<DriveFolder>;
    renameFolder(folderId: string, name: string): Promise<void>;
}

export function createGoogleFolderGateway(drive: drive_v3.Drive): DriveFolderGateway;
```

Every list uses `trashed=false`, `includeItemsFromAllDrives`,
`supportsAllDrives`, pagination, and `fields: nextPageToken,files(id,name,parents)`.

- [ ] **Step 4: Implement code-first resolution and hierarchy ensures**

`resolveStoreFolder` must:

```ts
export type StoreResolutionInput = {
    rootFolderId: string;
    branchName: string;
    storeCode: string;
    storeName: string;
};

export type StoreResolution = {
    branchFolderId: string;
    tokoFolderId: string;
    storeFolderId: string;
    maintenanceFolderId: string;
    repairedStoreCode: boolean;
    createdStoreFolder: boolean;
};
```

List the root once for exact branch name, list branch once for exact `Toko`,
parse every direct store child, then apply the approved precedence. Create only
the store and `Maintenance`; never ensure or modify `Building`.

- [ ] **Step 5: Add cache validation and rename invalidation**

Use `GoogleDriveFolderCache` keys containing root ID and stable identity:

```text
DRIVE_STORE:<rootId>:<normalizedBranch>:<normalizedStoreCode>
DRIVE_REPORT:<rootId>:<normalizedBranch>:<normalizedStoreCode>:<reportNumber>
DRIVE_PJUM:<rootId>:<normalizedBranch>:<bmsNIK>:<year>:<month>
```

Before returning a cached ID, call `getFolder` and verify its expected parent.
Delete an invalid cache row. Upsert cache only after a successful resolution.
Invalidate the store key before writing the repaired folder name, then upsert
the same ID after rename succeeds.

- [ ] **Step 6: Route the existing generic path helper through the gateway**

Keep `ensureDriveFolderPath` for non-migrated callers, but implement its folder
operations with `createGoogleFolderGateway(getGoogleDriveClient().drive)` so
pagination and duplicate behavior are shared. Do not let it become the store
identity resolver.

- [ ] **Step 7: Run resolver and existing Drive utility specs**

Run:

```bash
npx tsx lib/google-drive/hierarchy-service.spec.ts
npx tsx lib/google-drive/dev-proxy.spec.ts
npx tsx lib/storage/photo-url.spec.ts
```

Expected: all exit 0.

- [ ] **Step 8: Commit the resolver unit**

```bash
git add lib/google-drive/folder-gateway.ts lib/google-drive/hierarchy-service.ts lib/google-drive/hierarchy-service.spec.ts lib/google-drive/files.ts
git commit -m "feat: resolve Drive store hierarchy"
```

### Task 3: Reserve a Real Draft Report Before Checklist Upload

**Files:**
- Create: `lib/reports/drive-draft-service.ts`
- Create: `lib/reports/drive-draft-service.spec.ts`
- Create: `app/reports/actions/ensure-drive-draft.ts`
- Modify: `app/reports/actions/submit.ts`
- Modify: `app/reports/actions/draft.ts`
- Modify: `app/reports/actions.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Modify: `app/reports/(bms)/create/hooks/use-draft.ts`

**Interfaces:**
- Consumes: authenticated BMS NIK, selected store code, current draft report number, `generateReportNumber`, and Prisma transaction adapter.
- Produces: `ensureDriveDraftReport(storeCode): Promise<{ reportNumber: string } | { error: string }>` and promotion of that exact DRAFT in `submitReport`.

- [ ] **Step 1: Write service tests with a fake repository**

Cover reuse of a same-user/same-store DRAFT, replacement when the selected
store changes, reservation of a new report number, ownership rejection, and
promotion without creating a second row.

```ts
const first = await reserveDriveDraft(fakeRepo, {
    bmsNIK: "111",
    branchName: "BALI",
    storeCode: "Q001",
    storeName: "ALFAMART A",
});
const second = await reserveDriveDraft(fakeRepo, sameInput);
assert.equal(first.reportNumber, second.reportNumber);
assert.equal(fakeRepo.created.length, 1);

await promoteDriveDraft(fakeRepo, {
    reportNumber: first.reportNumber,
    bmsNIK: "111",
    status: "PENDING_ESTIMATION",
    items: [],
    estimations: [],
});
assert.equal(fakeRepo.created.length, 1);
assert.equal(fakeRepo.updated[0]?.reportNumber, first.reportNumber);
```

- [ ] **Step 2: Run the draft service spec and confirm failure**

Run: `npx tsx lib/reports/drive-draft-service.spec.ts`

Expected: FAIL with the missing service module.

- [ ] **Step 3: Implement injected draft reservation/promotion**

Define repository methods for `findDraft`, `createDraft`, `deleteDraft`, and
`promoteDraft`. Reservation validates that the store belongs to the BMS branch,
generates the number transactionally, and creates a minimal `Report` with
`status: "DRAFT"`, authoritative store/branch identity, empty JSON arrays, and
zero estimation.

- [ ] **Step 4: Add the authenticated server action**

```ts
const ensureDriveDraftSchema = z.object({ storeCode: z.string().trim().min(1).max(50) });

export async function ensureDriveDraftReport(storeCode: string) {
    const user = await requireRole("BMS");
    await validateCSRF(await headers());
    const parsed = ensureDriveDraftSchema.safeParse({ storeCode });
    if (!parsed.success) return { error: "Kode toko tidak valid" };
    return reserveDriveDraft(createPrismaDriveDraftRepository(prisma), {
        bmsNIK: user.NIK,
        branchName: user.branchName,
        storeCode: parsed.data.storeCode,
    });
}
```

- [ ] **Step 5: Promote the DRAFT in submit instead of creating a report**

Extend `DraftData` with required `draftReportNumber` for create mode. Inside the
existing transaction lock/select that row by `reportNumber`, `createdByNIK`,
and `status: DRAFT`, then update its workflow fields and create the SUBMITTED
activity. Resubmit mode continues updating its existing non-DRAFT report.

- [ ] **Step 6: Wire client draft state to the reserved report number**

Remove the `LCL-${Date.now()}` pseudo ID. Before the first checklist photo,
call `ensureDriveDraftReport(selectedStoreCode)`, persist the returned real
number in draft state, and pass it to the upload hook. Changing selected store
must discard the previous reserved draft only after tracked photos are deleted.

- [ ] **Step 7: Run focused draft and report-data tests**

Run:

```bash
npx tsx lib/reports/drive-draft-service.spec.ts
npx tsx app/reports/actions/types.spec.ts
npx tsx app/reports/actions/report-json-helpers.spec.ts
```

Expected: all exit 0.

- [ ] **Step 8: Commit the draft lifecycle**

```bash
git add lib/reports/drive-draft-service.ts lib/reports/drive-draft-service.spec.ts app/reports/actions/ensure-drive-draft.ts app/reports/actions/submit.ts app/reports/actions/draft.ts app/reports/actions.ts app/reports/'(bms)'/create/create-form.tsx app/reports/'(bms)'/create/hooks/use-draft.ts
git commit -m "feat: reserve report drafts for Drive"
```

### Task 4: Validate Context-Aware Photo Destinations

**Files:**
- Create: `lib/google-drive/photo-upload-context.ts`
- Create: `lib/google-drive/photo-upload-context.spec.ts`
- Create: `app/api/photos/upload/route.spec.ts`
- Modify: `app/api/photos/upload/route.ts`
- Modify: `lib/storage/drive-photo-service.ts`

**Interfaces:**
- Consumes: multipart `file`, JSON `context`, authenticated BMS, report/store rows, checklist catalog, CDN Drive client, and hierarchy service.
- Produces: unchanged `{ url, fileId }` response, with files created under an explicit evidence parent.

- [ ] **Step 1: Write schema and authorization-policy assertions**

Define and test this discriminated context:

```ts
export const photoUploadContextSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("CHECKLIST"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
    z.object({ kind: z.literal("START_SELFIE"), reportNumber: z.string().min(1) }),
    z.object({ kind: z.literal("START_RECEIPT"), reportNumber: z.string().min(1) }),
    z.object({
        kind: z.literal("START_MATERIAL_STORE"),
        reportNumber: z.string().min(1),
        entryId: z.string().min(1).max(100),
        index: z.number().int().min(0).max(99),
        name: z.string().trim().min(1).max(200),
        city: z.string().trim().min(1).max(200),
    }),
    z.object({ kind: z.literal("COMPLETION_RESULT"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
    z.object({ kind: z.literal("COMPLETION_RECEIPT"), reportNumber: z.string().min(1), itemId: z.string().min(1) }),
    z.object({ kind: z.literal("COMPLETION_ADDITIONAL"), reportNumber: z.string().min(1) }),
]);
```

Assert `CHECKLIST` permits owned DRAFT/revision states, start evidence permits
owned `ESTIMATION_APPROVED` or allowed revision, and completion evidence permits
owned `IN_PROGRESS` or allowed completion revision. Unknown checklist item IDs
fail before Drive calls.

- [ ] **Step 2: Run context and route specs and confirm failure**

Run:

```bash
npx tsx lib/google-drive/photo-upload-context.spec.ts
npx tsx app/api/photos/upload/route.spec.ts
```

Expected: FAIL because context parsing and injected route handler are absent.

- [ ] **Step 3: Change storage upload to require an explicit parent**

```ts
export async function uploadPhotoToDriveCdn(
    blob: Blob | File,
    input: { parentFolderId: string; fileName: string },
): Promise<DrivePhotoUploadOutcome>;
```

`attemptUpload` must set `parents: [input.parentFolderId]`. Remove every use of
`config.rootFolderId` as a file parent. Generate semantic names with a sequence
and `crypto.randomUUID().slice(0, 8)` before the extension.

- [ ] **Step 4: Extract an injected route handler and resolve authoritative metadata**

The route handler must parse `formData.get("context")` as JSON, load the report
including store and items, verify `createdByNIK === session.userId`, resolve
category/item metadata from the canonical checklist/report item, call
`ensureEvidenceFolder` with the CDN gateway/root, and only then upload.

Return status 409 for ambiguous Drive folders, 422 for context/status mismatch,
404 for missing report/store/item, and 500 for Drive failures. Log report,
branch, store code, evidence kind, and correlation ID without raw content.

- [ ] **Step 5: Assert there is no root-level upload fallback**

In `route.spec.ts`, inject a fake hierarchy resolver returning `evidence-123`
and assert the storage call receives exactly:

```ts
assert.deepEqual(uploadCalls[0], {
    parentFolderId: "evidence-123",
    fileName: assert.match(/checklist-001-[a-f0-9]{8}\.jpg/),
});
```

Also inject a resolver error and assert storage receives zero calls.

- [ ] **Step 6: Run focused photo server tests**

Run:

```bash
npx tsx lib/google-drive/photo-upload-context.spec.ts
npx tsx app/api/photos/upload/route.spec.ts
npx tsx lib/storage/photo-url.spec.ts
```

Expected: all exit 0.

- [ ] **Step 7: Commit the photo server path**

```bash
git add lib/google-drive/photo-upload-context.ts lib/google-drive/photo-upload-context.spec.ts app/api/photos/upload/route.ts app/api/photos/upload/route.spec.ts lib/storage/drive-photo-service.ts
git commit -m "feat: route photos into report folders"
```

### Task 5: Send Upload Context from Every Client Flow

**Files:**
- Modify: `lib/hooks/use-photo-upload.ts`
- Modify: `app/reports/(bms)/create/hooks/use-photo-upload.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx`
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts`
- Modify: `app/reports/[reportNumber]/completion/types.ts`

**Interfaces:**
- Consumes: `PhotoUploadContext` from Task 4 and the reserved/real report number from Task 3.
- Produces: every `/api/photos/upload` request containing `file` and serialized `context`.

- [ ] **Step 1: Add a source-level upload contract spec**

Create `lib/hooks/use-photo-upload.spec.ts` that reads both upload helpers and
asserts they append `context`, never issue a file-only request, and do not append
client branch/target-store names.

```ts
assert.match(sharedHook, /formData\.append\("context", JSON\.stringify\(context\)\)/);
assert.match(checklistHook, /kind:\s*"CHECKLIST"/);
assert.doesNotMatch(sharedHook, /branchName/);
```

- [ ] **Step 2: Run the contract spec and confirm failure**

Run: `npx tsx lib/hooks/use-photo-upload.spec.ts`

Expected: FAIL because the current hooks append only `file`.

- [ ] **Step 3: Require context in the shared hook**

```ts
const uploadPhoto = async (
    file: File,
    context: PhotoUploadContext,
): Promise<PhotoUploadResult | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", JSON.stringify(context));
    // existing fetch/response handling
};
```

- [ ] **Step 4: Add checklist context after draft reservation**

The create hook obtains a real `draftReportId` through
`ensureDriveDraftReport`, then appends:

```ts
{
    kind: "CHECKLIST",
    reportNumber: draftReportId,
    itemId: activePhotoItemId,
}
```

Deleting/replacing an initial checklist photo calls the existing DELETE route
with its Drive file ID before clearing `photoKey`.

- [ ] **Step 5: Add start-work contexts**

Map selfie, receipt, and each material-store photo respectively to
`START_SELFIE`, `START_RECEIPT`, and:

```ts
{
    kind: "START_MATERIAL_STORE",
    reportNumber,
    entryId: store.id,
    index: storeIndex,
    name: store.name,
    city: store.city,
}
```

- [ ] **Step 6: Add completion contexts**

Map `afterImages`, per-item receipt photos, and additional documentation to
`COMPLETION_RESULT`, `COMPLETION_RECEIPT`, and `COMPLETION_ADDITIONAL`.
Start-work revision controls in the completion form continue using the three
start-work kinds.

- [ ] **Step 7: Run client contract and existing evidence tests**

Run:

```bash
npx tsx lib/hooks/use-photo-upload.spec.ts
npx tsx lib/start-work-evidence.spec.ts
npx tsx lib/completion-evidence.spec.ts
npx tsc --noEmit
```

Expected: specs exit 0 and TypeScript reports no errors.

- [ ] **Step 8: Commit all client contexts**

```bash
git add lib/hooks/use-photo-upload.ts lib/hooks/use-photo-upload.spec.ts app/reports/'(bms)'/create/hooks/use-photo-upload.ts app/reports/'(bms)'/create/create-form.tsx app/reports/'[reportNumber]'/start/start-work-client.tsx app/reports/'[reportNumber]'/completion/use-completion-work-form.ts app/reports/'[reportNumber]'/completion/types.ts
git commit -m "feat: attach context to photo uploads"
```

### Task 6: Move Final and Revision PDFs into `01 - Dokumen`

**Files:**
- Modify: `lib/google-drive/archive.ts`
- Modify: `lib/pdf/snapshot-storage.ts`
- Modify: `app/dashboard/intervensi/revisi-laporan/actions.ts`
- Modify: `app/reports/pjum/approval-actions.ts`
- Create: `lib/google-drive/report-archive.spec.ts`

**Interfaces:**
- Consumes: `ensureReportDocumentFolder`, final/revision filename policy, PDF buffers, and report/store metadata.
- Produces: `uploadCompletedReportToDrive` and `uploadRevisionReportToDrive`, each returning file and folder URLs.

- [x] **Step 1: Write archive destination assertions**

With an injected fake hierarchy/upload adapter, assert final and revision use
the same document folder, separate deterministic names, and overwrite enabled:

```ts
assert.deepEqual(finalUpload, {
    folderId: "documents-1",
    fileName: "Q001-2608-001 - Laporan Final.pdf",
    overwriteIfExists: true,
});
assert.deepEqual(revisionUpload, {
    folderId: "documents-1",
    fileName: "Q001-2608-001 - Laporan Revisi.pdf",
    overwriteIfExists: true,
});
```

- [x] **Step 2: Run the archive spec and confirm failure**

Run: `npx tsx lib/google-drive/report-archive.spec.ts`

Expected: FAIL because the archive service still builds the legacy BMS/store path.

- [x] **Step 3: Replace legacy path construction with hierarchy resolution**

`uploadCompletedReportToDrive` receives branch/store/report metadata only,
resolves `Maintenance/<report>/01 - Dokumen`, and uploads the final filename.
Add `uploadRevisionReportToDrive` with the same folder resolver and revision
filename. Remove BMS folders from report paths.

- [x] **Step 4: Update snapshot and PJUM approval callers**

Replace `buildFinalReportDrivePath` plus `uploadPdfSnapshot` for final report
publication with `uploadCompletedReportToDrive`. Keep transient snapshot APIs
for workflow snapshots only; they must not produce a canonical final path.

- [x] **Step 5: Update Admin revision action**

Remove its manual legacy `ensureDriveFolderPath` construction. Call
`uploadRevisionReportToDrive`, persist `revisedPdfDriveUrl` and the returned
document folder URL, and retain rollback deletion if the database update fails.

- [x] **Step 6: Run archive, PDF, and revision-focused checks**

Run:

```bash
npx tsx lib/google-drive/report-archive.spec.ts
npx tsc --noEmit
```

Expected: spec exits 0 and TypeScript reports no errors.

- [x] **Step 7: Commit canonical report documents**

```bash
git add lib/google-drive/archive.ts lib/google-drive/report-archive.spec.ts lib/pdf/snapshot-storage.ts app/dashboard/intervensi/revisi-laporan/actions.ts app/reports/pjum/approval-actions.ts
git commit -m "feat: archive reports in store Maintenance"
```

### Task 7: Move PJUM into the Branch-Level Archive

**Files:**
- Modify: `lib/google-drive/archive.ts`
- Modify: `app/reports/pjum/approval-actions.ts`
- Extend: `lib/google-drive/report-archive.spec.ts`

**Interfaces:**
- Consumes: branch, BMS identity, year, month, week, report count, document code, and PDF buffer.
- Produces: PJUM in `<branch>/PJUM Sparta-Maintenance/<NIK> - <name>/<year>/<month>`.

- [x] **Step 1: Add a failing PJUM path assertion**

```ts
assert.deepEqual(pjumFolderRequest, {
    branchName: "BALI",
    relativePath: ["PJUM Sparta-Maintenance", "111 - BMS User", "2026", "Agustus"],
});
assert.equal(
    pjumUpload.fileName,
    "PJUM Agustus Minggu ke 4 - 3 Laporan - abcdef12.pdf",
);
```

- [x] **Step 2: Run the archive spec and confirm the PJUM assertion fails**

Run: `npx tsx lib/google-drive/report-archive.spec.ts`

Expected: FAIL showing the legacy `PJUM/<branch>` path.

- [x] **Step 3: Implement branch-level PJUM resolution**

Use `ensurePjumMonthFolder`; preserve deterministic overwrite semantics and
sanitize month/document code. Remove `ensureBmcPjumArchiveFolder` if no caller
remains.

- [x] **Step 4: Run the archive spec**

Run: `npx tsx lib/google-drive/report-archive.spec.ts`

Expected: PASS with exit code 0.

- [x] **Step 5: Commit PJUM placement**

```bash
git add lib/google-drive/archive.ts lib/google-drive/report-archive.spec.ts app/reports/pjum/approval-actions.ts
git commit -m "feat: archive PJUM at branch level"
```

### Task 8: Clean Draft Files, Remove the Legacy Archive Path, and Finalize Root Config

**Files:**
- Modify: `lib/jobs/cleanup-pending-reports.ts`
- Create: `lib/jobs/cleanup-pending-reports.spec.ts`
- Modify: `lib/google-drive/cdn-client.ts`
- Create: `lib/google-drive/cdn-client-config.spec.ts`
- Remove: `lib/google-drive/photos.ts`
- Modify any cleanup script imports found by `Select-String` before deletion.

**Interfaces:**
- Consumes: expired DRAFT rows, tracked `drivePhotoFileIds`, CDN delete service, and root env values.
- Produces: idempotent draft cleanup and one canonical operational root.

- [x] **Step 1: Write failing cleanup and config assertions**

Inject a fake report repository and delete function. Assert all tracked file IDs
are attempted before a DRAFT row is deleted, a failed file delete leaves the row
for retry, and successful cleanup increments both counters.

For root resolution assert:

```ts
assert.equal(resolveDriveCdnRoot({ GOOGLE_DRIVE_ROOT_FOLDER_ID: "canonical", DRIVE_CDN_ROOT_FOLDER_ID: "legacy" }), "canonical");
assert.equal(resolveDriveCdnRoot({ DRIVE_CDN_ROOT_FOLDER_ID: "legacy" }), "legacy");
assert.throws(() => resolveDriveCdnRoot({}), /GOOGLE_DRIVE_ROOT_FOLDER_ID/);
```

- [x] **Step 2: Run cleanup/config specs and confirm failure**

Run:

```bash
npx tsx lib/jobs/cleanup-pending-reports.spec.ts
npx tsx lib/google-drive/cdn-client-config.spec.ts
```

Expected: FAIL because dependency injection and root resolver are absent.

- [x] **Step 3: Implement idempotent DRAFT cleanup**

Query expired `DRAFT` rows with `reportNumber` and `drivePhotoFileIds`. Delete
each valid Drive file ID. Only after every tracked deletion succeeds, remove
logs and the report transactionally. Keep existing pending cleanup behavior
unchanged unless its status selection is proven intentional by tests.

- [x] **Step 4: Add canonical root fallback**

Export a pure `resolveDriveCdnRoot` and set CDN config with
`GOOGLE_DRIVE_ROOT_FOLDER_ID ?? DRIVE_CDN_ROOT_FOLDER_ID`. Log one deprecation
warning when only the legacy variable is used. Do not change CDN OAuth credentials.

- [x] **Step 5: Remove obsolete post-approval photo archiving**

Run:

```powershell
Get-ChildItem app,lib,scripts -Recurse -File | Select-String -Pattern 'archiveReportPhotosToGoogleDrive|collectCategorizedPhotoUrls'
```

Expected before removal: no active imports outside `lib/google-drive/photos.ts`.
Delete that file. If a real caller appears, replace it with a no-op-free direct
hierarchy call and add that caller to the focused TypeScript check.

- [x] **Step 6: Run cleanup/config and TypeScript checks**

Run:

```bash
npx tsx lib/jobs/cleanup-pending-reports.spec.ts
npx tsx lib/google-drive/cdn-client-config.spec.ts
npx tsc --noEmit
```

Expected: all checks pass.

- [x] **Step 7: Commit cleanup and root config**

```bash
git add lib/jobs/cleanup-pending-reports.ts lib/jobs/cleanup-pending-reports.spec.ts lib/google-drive/cdn-client.ts lib/google-drive/cdn-client-config.spec.ts lib/google-drive/photos.ts
git commit -m "chore: retire flat Drive photo root"
```

### Task 9: Document Cutover and Perform Full Verification

**Files:**
- Modify: `docs/project/07-integrations-and-env.md`
- Modify: `docs/project/08-operations.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-google-drive-hierarchy.md`

**Interfaces:**
- Consumes: completed implementation and approved design.
- Produces: operator-ready env/cutover/rollback instructions and required task note.

- [ ] **Step 1: Update canonical integration documentation**

Document that `GOOGLE_DRIVE_ROOT_FOLDER_ID` points to `DOKUMEN SPARTA`, the CDN
credentials remain active, the CDN root variable is compatibility-only, both
OAuth identities need Editor access, and `BACKUP_DRIVE_FOLDER_ID` stays outside
the operational hierarchy.

- [ ] **Step 2: Add exact Dokploy cutover and rollback checks**

Add this sequence to operations documentation:

```text
1. Record previous GOOGLE_DRIVE_ROOT_FOLDER_ID and DRIVE_CDN_ROOT_FOLDER_ID.
2. Deploy the hierarchy-aware application image.
3. Set both root variables to DOKUMEN SPARTA for the compatibility rollout.
4. Click Deploy so Dokploy recreates the container with the new environment.
5. Verify one checklist photo, start photo, completion photo, final PDF, revision PDF, and PJUM parent folder.
6. Roll back by restoring the previous image and both previous root IDs; never delete new-root files during rollback.
```

- [ ] **Step 3: Run every focused spec**

Run:

```bash
npx tsx lib/google-drive/hierarchy-policy.spec.ts
npx tsx lib/google-drive/hierarchy-service.spec.ts
npx tsx lib/reports/drive-draft-service.spec.ts
npx tsx lib/google-drive/photo-upload-context.spec.ts
npx tsx app/api/photos/upload/route.spec.ts
npx tsx lib/hooks/use-photo-upload.spec.ts
npx tsx lib/google-drive/report-archive.spec.ts
npx tsx lib/jobs/cleanup-pending-reports.spec.ts
npx tsx lib/google-drive/cdn-client-config.spec.ts
```

Expected: every command exits 0.

- [ ] **Step 4: Run repository-wide verification**

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
npm run check:agent-note
git diff --check
```

Expected: all commands exit 0. If an unrelated pre-existing failure occurs,
record its exact command and output summary in the task note without weakening
the focused Drive verification.

- [ ] **Step 5: Perform a non-production Drive smoke test**

With a dedicated test root containing a branch, `Toko`, one existing Building
store, one placeholder-code store, and one wrong-code store, verify:

```text
- exact code reuses the expected store folder;
- normalized name repairs only the final code segment;
- missing store creates BELUM DIISI - <name> - <code>;
- Maintenance appears beside Building;
- each evidence kind lands under its report folder;
- no photo file is a direct child of DOKUMEN SPARTA;
- PJUM lands beside Toko at branch level;
- backup folder is not touched.
```

- [ ] **Step 6: Write the dated task note**

Use `docs/agent-notes/TEMPLATE.md`, list exact changed files, verification
results, deployment still pending, legacy migration excluded, and the manual
duplicate-folder remediation risk.

- [ ] **Step 7: Commit documentation and verification record**

```bash
git add docs/project/07-integrations-and-env.md docs/project/08-operations.md docs/agent-notes/YYYY-MM-DD-HHMM-google-drive-hierarchy.md
git commit -m "docs: add Drive hierarchy cutover"
```
