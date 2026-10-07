# BMS Store Coverage Binding & Preventive KPI Monitoring Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Mengikat penugasan toko spesifik ke setiap user BMS (`BmsStoreAssignment`), menutup celah pelaporan di luar wilayah coverage, mengintegrasikan penugasan ke manajemen toko, dan menyediakan monitoring performa/KPI preventif kuartalan di level BMS, BMC, BNM, dan Admin.

**Architecture:** Model relasi terdedikasi `BmsStoreAssignment` dengan partial unique index di PostgreSQL menjamin integritas 1 toko hanya dipegang 1 BMS aktif sambil mencatat riwayat mutasi toko. Form laporan dan backend guard membatasi BMS hanya pada toko binaannya, sementara engine KPI preventif kuartalan menghitung realisasi terhadap target toko coverage aktif.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma 7, PostgreSQL (Aiven), Tailwind CSS 4, shadcn/ui, xlsx, node:test.

---

### Task 1: Prisma Schema & Migration for `BmsStoreAssignment`

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/schema/bms-store-assignment-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/schema/bms-store-assignment-schema.test.ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const schema = readFileSync("prisma/schema.prisma", "utf8");

test("schema contains BmsStoreAssignment model with required fields", () => {
    assert.match(schema, /model BmsStoreAssignment \{/);
    assert.match(schema, /bmsNIK\s+String/);
    assert.match(schema, /storeCode\s+String/);
    assert.match(schema, /isActive\s+Boolean\s+@default\(true\)/);
    assert.match(schema, /assignedAt\s+DateTime/);
    assert.match(schema, /unassignedAt\s+DateTime\?/);
    assert.match(schema, /bms\s+User\s+@relation\("BmsAssignments"/);
    assert.match(schema, /store\s+Store\s+@relation\("StoreAssignments"/);
});

test("schema User and Store have relations to BmsStoreAssignment", () => {
    assert.match(schema, /assignedStores\s+BmsStoreAssignment\[\]\s+@relation\("BmsAssignments"\)/);
    assert.match(schema, /storeAssignments\s+BmsStoreAssignment\[\]\s+@relation\("StoreAssignments"\)/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/schema/bms-store-assignment-schema.test.ts`
Expected: FAIL with assertion error.

**Step 3: Update `prisma/schema.prisma` and generate client**

1. Tambahkan model `BmsStoreAssignment`:
```prisma
model BmsStoreAssignment {
  id              String    @id @default(uuid())
  bmsNIK          String
  storeCode       String
  isActive        Boolean   @default(true)
  assignedAt      DateTime  @default(now()) @db.Timestamptz(3)
  assignedByNIK   String?
  unassignedAt    DateTime? @db.Timestamptz(3)
  unassignedByNIK String?
  notes           String?

  bms             User      @relation("BmsAssignments", fields: [bmsNIK], references: [NIK])
  store           Store     @relation("StoreAssignments", fields: [storeCode], references: [code])

  @@index([storeCode, isActive])
  @@index([bmsNIK, isActive])
  @@index([bmsNIK, storeCode])
}
```
2. Tambahkan `assignedStores BmsStoreAssignment[] @relation("BmsAssignments")` di `model User`.
3. Tambahkan `storeAssignments BmsStoreAssignment[] @relation("StoreAssignments")` di `model Store`.
4. Jalankan: `npm run db:generate`.
5. Jalankan query SQL pembuatan tabel dan partial unique index ke database via helper script:
```sql
CREATE TABLE IF NOT EXISTS "BmsStoreAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bmsNIK" TEXT NOT NULL REFERENCES "User"("NIK"),
    "storeCode" TEXT NOT NULL REFERENCES "Store"("code"),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByNIK" TEXT,
    "unassignedAt" TIMESTAMPTZ(3),
    "unassignedByNIK" TEXT,
    "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "BmsStoreAssignment_storeCode_isActive_idx" ON "BmsStoreAssignment"("storeCode", "isActive");
CREATE INDEX IF NOT EXISTS "BmsStoreAssignment_bmsNIK_isActive_idx" ON "BmsStoreAssignment"("bmsNIK", "isActive");
CREATE INDEX IF NOT EXISTS "BmsStoreAssignment_bmsNIK_storeCode_idx" ON "BmsStoreAssignment"("bmsNIK", "storeCode");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_store_assignment" ON "BmsStoreAssignment"("storeCode") WHERE "isActive" = true;
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/schema/bms-store-assignment-schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prisma/schema.prisma tests/schema/bms-store-assignment-schema.test.ts
git commit -m "feat(db): add BmsStoreAssignment model and partial unique index"
```

---

### Task 2: Data Import Script from Master Excel

**Files:**
- Create: `scripts/import-bms-store-assignments.ts`
- Test: `tests/scripts/import-bms-assignments.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/scripts/import-bms-assignments.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBmsNik, isValidAssignmentRow } from "@/scripts/import-bms-store-assignments";

test("normalizeBmsNik correctly pads numeric and string NIK to 8 digits", () => {
    assert.equal(normalizeBmsNik(8070747), "08070747");
    assert.equal(normalizeBmsNik("8070747"), "08070747");
    assert.equal(normalizeBmsNik("23054595"), "23054595");
    assert.equal(normalizeBmsNik(23054595), "23054595");
    assert.equal(normalizeBmsNik("VACANT"), null);
    assert.equal(normalizeBmsNik(null), null);
});

test("isValidAssignmentRow filters out vacant and empty rows", () => {
    assert.equal(isValidAssignmentRow("Q043", "23054595"), true);
    assert.equal(isValidAssignmentRow("", "23054595"), false);
    assert.equal(isValidAssignmentRow("Q043", null), false);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/scripts/import-bms-assignments.test.ts`
Expected: FAIL (module not found).

**Step 3: Implement `scripts/import-bms-store-assignments.ts`**

Membaca sheet `GABUNG CABANG` dari file Excel:
- Ekstrak helper function `normalizeBmsNik` dan `isValidAssignmentRow`.
- Cek ketersediaan NIK di database `User` (role BMS).
- Cek ketersediaan `storeCode` di database `Store`.
- Lakukan chunked batch upsert ke tabel `BmsStoreAssignment` (`isActive: true`).
- Catat data yang dilewati ke `logs/skipped-bms-assignments.json`.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/scripts/import-bms-assignments.test.ts`
Expected: PASS

**Step 5: Run import script against master file**

Run: `npx tsx scripts/import-bms-store-assignments.ts "C:/Users/Rendi Elang/Downloads/TOKO BMS AGUSTUS 2026.xlsx"`
Expected: Output menampilkan summary: ~21.000 penugasan aktif berhasil dimasukkan ke tabel `BmsStoreAssignment`.

**Step 6: Commit**

```bash
git add scripts/import-bms-store-assignments.ts tests/scripts/import-bms-assignments.test.ts
git commit -m "feat(import): add cli script for bms store assignments import"
```

---

### Task 3: Form Protection & Backend Guard for BMS Report Creation

**Files:**
- Modify: `app/reports/actions/queries.ts`
- Modify: `app/reports/(bms)/create/page.tsx`
- Modify: `app/reports/actions/submit.ts`
- Modify: `app/reports/actions/resubmit.ts`
- Test: `tests/reports/bms-store-guard.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/reports/bms-store-guard.test.ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const queriesSource = readFileSync("app/reports/actions/queries.ts", "utf8");
const createPageSource = readFileSync("app/reports/(bms)/create/page.tsx", "utf8");
const submitSource = readFileSync("app/reports/actions/submit.ts", "utf8");

test("queries exports getAssignedStoresForBms", () => {
    assert.match(queriesSource, /export async function getAssignedStoresForBms/);
});

test("create page fetches stores via getAssignedStoresForBms", () => {
    assert.match(createPageSource, /getAssignedStoresForBms\(user\.NIK\)/);
});

test("submit action checks store assignment guard", () => {
    assert.match(submitSource, /bmsStoreAssignment\.findFirst/);
    assert.match(submitSource, /Toko di luar wilayah coverage Anda/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/reports/bms-store-guard.test.ts`
Expected: FAIL

**Step 3: Implement queries and guards**

1. Di `app/reports/actions/queries.ts`:
   Buat fungsi `getAssignedStoresForBms(bmsNIK: string)` yang melakukan query ke `Store` yang berelasi aktif dengan `bmsNIK` di `BmsStoreAssignment`.
2. Di `app/reports/(bms)/create/page.tsx`:
   Gantikan `getStoresByBranch` dengan `getAssignedStoresForBms(user.NIK)`.
3. Di `app/reports/actions/submit.ts` & `resubmit.ts`:
   Sebelum membuat laporan, validasi `prisma.bmsStoreAssignment.findFirst({ where: { bmsNIK: user.NIK, storeCode: data.storeCode, isActive: true } })`. Jika tidak ditemukan, kembalikan response error `"Toko di luar wilayah coverage Anda"`.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/reports/bms-store-guard.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reports/actions/queries.ts app/reports/(bms)/create/page.tsx app/reports/actions/submit.ts app/reports/actions/resubmit.ts tests/reports/bms-store-guard.test.ts
git commit -m "feat(reports): restrict bms report creation to assigned coverage stores"
```

---

### Task 4: Store Management Integration in Admin/BMC Dashboard

**Files:**
- Modify: `app/dashboard/stores/actions.ts`
- Modify: `app/dashboard/stores/_components/admin-stores-table.tsx`
- Modify: `app/admin/database/_components/store-form-dialog.tsx`
- Modify: `app/admin/database/actions.ts`
- Test: `tests/stores/store-assignment-ui.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/stores/store-assignment-ui.test.ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const actionsSource = readFileSync("app/dashboard/stores/actions.ts", "utf8");
const tableSource = readFileSync("app/dashboard/stores/_components/admin-stores-table.tsx", "utf8");
const dialogSource = readFileSync("app/admin/database/_components/store-form-dialog.tsx", "utf8");

test("stores actions include assignment selection and bms filter", () => {
    assert.match(actionsSource, /storeAssignments/);
    assert.match(actionsSource, /bmsNIK\?: string;/);
    assert.match(actionsSource, /export async function assignStoreToBms/);
});

test("stores table renders BMS coverage column", () => {
    assert.match(tableSource, /BMS Coverage/);
});

test("store dialog has bms dropdown field", () => {
    assert.match(dialogSource, /bmsNIK/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/stores/store-assignment-ui.test.ts`
Expected: FAIL

**Step 3: Implement store management changes**

1. Di `app/dashboard/stores/actions.ts`:
   - Di `getAdminStores`, tambahkan include/select untuk penugasan aktif: `storeAssignments: { where: { isActive: true }, include: { bms: { select: { NIK: true, name: true } } } }`.
   - Tambahkan filter `bmsNIK?: string` di `AdminStoreFilters`.
   - Tambahkan server action `assignStoreToBms(storeCode, bmsNIK, notes)`.
2. Di `app/admin/database/_components/store-form-dialog.tsx`:
   - Tambahkan dropdown select `BMS Penanggung Jawab`.
   - Ambil daftar BMS sesuai `branch` yang dipilih.
3. Di `app/dashboard/stores/_components/admin-stores-table.tsx`:
   - Tampilkan kolom `BMS Coverage` dengan badge nama & NIK BMS atau `Belum Ditugaskan`.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/stores/store-assignment-ui.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/dashboard/stores/actions.ts app/dashboard/stores/_components/admin-stores-table.tsx app/admin/database/_components/store-form-dialog.tsx app/admin/database/actions.ts tests/stores/store-assignment-ui.test.ts
git commit -m "feat(stores): integrate bms assignment into store management UI"
```

---

### Task 5: Quarterly Preventive KPI Engine & BMS Mobile Coverage Alignment

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`
- Modify: `app/dashboard/coverage/page.tsx`
- Modify: `app/dashboard/_components/bms-preventive-card.tsx`
- Test: `tests/preventive/bms-coverage-kpi-engine.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/preventive/bms-coverage-kpi-engine.test.ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const actionsSource = readFileSync("app/dashboard/preventive/actions.ts", "utf8");

test("getBmsPreventiveCoverage queries BmsStoreAssignment for target stores", () => {
    assert.match(actionsSource, /BmsStoreAssignment/);
    assert.match(actionsSource, /bmsNIK/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/preventive/bms-coverage-kpi-engine.test.ts`
Expected: FAIL

**Step 3: Implement updated `getBmsPreventiveCoverage` logic**

- Di `app/dashboard/preventive/actions.ts`:
  Ubah query `getBmsPreventiveCoverage` agar target toko dihitung dari `BmsStoreAssignment WHERE bmsNIK = user.NIK AND isActive = true`.
- Pastikan realisasi selesai hanya menghitung toko coveragenya yang memiliki laporan sah di kuartal berjalan.
- Persentase: `(completed / total) * 100%`.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/preventive/bms-coverage-kpi-engine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/dashboard/preventive/actions.ts app/dashboard/coverage/page.tsx app/dashboard/_components/bms-preventive-card.tsx tests/preventive/bms-coverage-kpi-engine.test.ts
git commit -m "feat(kpi): align bms preventive coverage calculation with store assignments"
```

---

### Task 6: Multi-Role KPI Monitoring UI in `/dashboard/bms-performance` & Dashboard Widgets

**Files:**
- Modify: `app/dashboard/bms-performance/actions.ts`
- Modify: `app/dashboard/bms-performance/page.tsx`
- Create: `app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx`
- Modify: `app/dashboard/_components/manager-dashboard.tsx`
- Modify: `app/dashboard/_components/admin/admin-new-dashboard.tsx`
- Modify: `components/app-sidebar.tsx`
- Test: `tests/performance/bms-kpi-monitoring.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/performance/bms-kpi-monitoring.test.ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const actionsSource = readFileSync("app/dashboard/bms-performance/actions.ts", "utf8");
const pageSource = readFileSync("app/dashboard/bms-performance/page.tsx", "utf8");
const sidebarSource = readFileSync("components/app-sidebar.tsx", "utf8");

test("performance actions include quarterly preventive kpi calculation", () => {
    assert.match(actionsSource, /targetCoverageStores/);
    assert.match(actionsSource, /completedPreventiveStores/);
    assert.match(actionsSource, /preventiveKpiRate/);
});

test("performance page renders kpi columns and coverage dialog trigger", () => {
    assert.match(pageSource, /Target Coverage/);
    assert.match(pageSource, /KPI Preventif/);
});

test("sidebar allows Admin, BMC, and BNM to access Performa BMS", () => {
    assert.doesNotMatch(sidebarSource, /if\s*\(authUser\.role === "ADMIN"\)\s*\{\s*return title !== "Performa BMS";\s*\}/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/performance/bms-kpi-monitoring.test.ts`
Expected: FAIL

**Step 3: Implement KPI monitoring UI and widgets**

1. Di `app/dashboard/bms-performance/actions.ts`:
   Tambahkan metrik `targetCoverageStores`, `completedPreventiveStores`, `pendingPreventiveStores`, `preventiveKpiRate` per BMS di kuartal terpilih.
2. Di `app/dashboard/bms-performance/page.tsx`:
   Tampilkan kolom-kolom KPI tersebut dengan progress bar dan tombol "Lihat Rincian Toko" yang membuka dialog `BmsCoverageDetailDialog`.
3. Di `components/app-sidebar.tsx`:
   Izinkan role `ADMIN`, `BMC`, dan `BNM_MANAGER` melihat menu "Performa BMS".
4. Di `ManagerDashboard` dan `AdminNewDashboard`:
   Tampilkan widget ringkasan KPI Preventif BMS (rata-rata pencapaian cabang, leaderboard pencapaian tertinggi dan terendah).

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/performance/bms-kpi-monitoring.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/dashboard/bms-performance/actions.ts app/dashboard/bms-performance/page.tsx app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx app/dashboard/_components/manager-dashboard.tsx app/dashboard/_components/admin/admin-new-dashboard.tsx components/app-sidebar.tsx tests/performance/bms-kpi-monitoring.test.ts
git commit -m "feat(monitoring): add comprehensive bms preventive kpi monitoring for admin, bmc, and bnm"
```

---

### Task 7: Full System Verification, Typecheck, and Final Task Note

**Files:**
- All modified files
- Create: `docs/agent-notes/2026-10-07-1420-bms-store-coverage-kpi-implementation.md`

**Step 1: Run all test suites**

Run: `npx tsx --test tests/**/*.test.ts`
Expected: All tests PASS.

**Step 2: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: 0 type errors.

**Step 3: Create final task note**

Buat file task note Asia/Jakarta time di `docs/agent-notes/2026-10-07-1420-bms-store-coverage-kpi-implementation.md` merangkum semua perubahan yang telah selesai.

**Step 4: Commit**

```bash
git add docs/agent-notes/2026-10-07-1420-bms-store-coverage-kpi-implementation.md
git commit -m "chore: complete bms store coverage and kpi monitoring implementation"
```
