# BMS Coverage Tab Hierarchy Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Memindahkan fitur monitoring performa/coverage BMS dari menu sidebar Admin ke tab default pertama **"Coverage BMS"** di halaman Checklist Preventif (`/dashboard/preventive`) dengan tampilan hirarki 3-level (*Cabang* ➔ *BMS* ➔ *Toko*).

**Architecture:** Data penugasan toko aktif (`BmsStoreAssignment`) dan status checklist preventif (`MaintenanceReport` COMPLETED per kuartal) diagregasikan secara terstruktur per cabang dan per BMS melalui server action. Di sisi klien, komponen tabel hierarkis interaktif menyajikan Level 1 (Summary Cabang), yang dapat di-expand ke Level 2 (Daftar BMS di cabang tersebut), dan di-expand lebih lanjut ke Level 3 (Daftar toko yang ditugaskan ke BMS tersebut beserta status preventif dan nomor laporannya). Untuk user role BMC, cabang miliknya otomatis ter-expand secara default.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM, Tailwind CSS, Radix/Shadcn UI (`Table`, `Tabs`, `Badge`, `Button`, `Input`), Lucide Icons.

---

### Task 1: Sembunyikan Performa BMS dari Sidebar Admin

**Files:**
- Modify: `components/app-sidebar.tsx:195-202`
- Test: `tests/preventive/sidebar-admin-bms.test.ts`

**Step 1: Write the failing test**
Create `tests/preventive/sidebar-admin-bms.test.ts`:
```typescript
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const sidebarSource = readFileSync("components/app-sidebar.tsx", "utf8");

test("sidebar hides Performa BMS for ADMIN role", () => {
    assert.match(
        sidebarSource,
        /if\s*\(\s*authUser\.role\s*===\s*["']ADMIN["']\s*\)\s*\{\s*return\s+title\s*!==\s*["']Performa BMS["'];\s*\}/,
    );
});
```

**Step 2: Run test to verify it fails**
Run: `npx tsx --test tests/preventive/sidebar-admin-bms.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Di `components/app-sidebar.tsx`, ubah:
```typescript
        if (authUser.role === "ADMIN") {
            return title !== "Performa BMS";
        }
```

**Step 4: Run test to verify it passes**
Run: `npx tsx --test tests/preventive/sidebar-admin-bms.test.ts`
Expected: PASS

---

### Task 2: Server Action Agregasi Data Hirarki Coverage BMS per Cabang

**Files:**
- Create/Modify: `app/dashboard/preventive/coverage-hierarchy-action.ts` (atau diekspor dari `app/dashboard/preventive/actions.ts`)
- Test: `tests/preventive/bms-coverage-hierarchy-action.test.ts`

**Step 1: Write the failing test**
Create `tests/preventive/bms-coverage-hierarchy-action.test.ts`:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { getBmsCoverageHierarchy } from "../../app/dashboard/preventive/coverage-hierarchy-action";

test("getBmsCoverageHierarchy function is defined and callable", () => {
    assert.equal(typeof getBmsCoverageHierarchy, "function");
});
```

**Step 2: Run test to verify it fails**
Run: `npx tsx --test tests/preventive/bms-coverage-hierarchy-action.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**
Implementasikan fungsi `getBmsCoverageHierarchy({ year, quarter, branchName, brand })` yang:
1. Menentukan range tanggal kuartal terpilih (`getQuarterDateRange(year, quarter)`).
2. Mengambil semua penugasan aktif dari `BmsStoreAssignment` yang berelasi dengan `store` dan `bms` (User).
3. Mengambil laporan preventif selesai pada rentang kuartal tersebut untuk toko-toko yang relevan.
4. Mengelompokkan data per Cabang ➔ per BMS ➔ Toko:
   - Level 1: `branchName`, `bmsCount`, `totalStores`, `completedStores`, `pendingStores`, `coverageRate`.
   - Level 2: `bmsNIK`, `bmsName`, `totalStores`, `completedStores`, `pendingStores`, `kpiRate`.
   - Level 3: `stores: Array<{ storeCode, storeName, isCompleted, reportNumber }>`
5. Mengurutkan Cabang ascending, BMS ascending per nama, dan Toko ascending per kode/nama toko.

**Step 4: Run test to verify it passes**
Run: `npx tsx --test tests/preventive/bms-coverage-hierarchy-action.test.ts`
Expected: PASS

---

### Task 3: Komponen Tampilan Hirarki 3-Level (`BmsCoverageHierarchyTable`)

**Files:**
- Create: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`
- Test: `tests/preventive/bms-coverage-hierarchy-ui.test.ts`

**Step 1: Write the failing test**
Create `tests/preventive/bms-coverage-hierarchy-ui.test.ts`:
```typescript
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const uiSource = readFileSync(
    "app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx",
    "utf8",
);

test("bms coverage hierarchy table supports multi-level expansion", () => {
    assert.match(uiSource, /expandedBranches/);
    assert.match(uiSource, /expandedBms/);
    assert.match(uiSource, /toggleBranch/);
    assert.match(uiSource, /toggleBms/);
});
```

**Step 2: Run test to verify it fails**
Run: `npx tsx --test tests/preventive/bms-coverage-hierarchy-ui.test.ts`
Expected: FAIL (file not found)

**Step 3: Write minimal implementation**
Buat komponen `BmsCoverageHierarchyTable`:
- Props: `initialHierarchy: BranchCoverageSummary[]`, `defaultBranch?: string`, `isBmc?: boolean`.
- State `expandedBranches` (Set<string>) & `expandedBms` (Set<string>).
- Jika `isBmc` bernilai `true` atau hanya ada 1 cabang, cabang tersebut otomatis masuk ke `expandedBranches`.
- Toolbar pencarian (mencari cabang, BMS, atau nama toko).
- Tabel dengan styling bersih dan responsif:
  - **Baris Level 1 (Cabang):** Background slate-50/soft, Chevron toggle, Nama Cabang, Badge BMS Count, Total Toko, Selesai, Pending, Progress Bar Coverage Cabang.
  - **Baris Level 2 (BMS di bawah cabang):** Indentasi, Chevron toggle, Nama & NIK BMS, Target Toko, Selesai, Pending, Badge KPI Rate.
  - **Baris Level 3 (Toko di bawah BMS):** Indentasi lebih dalam, Tabel toko coverage (Kode, Nama Toko, Badge Status Selesai/Pending, Link Laporan).

**Step 4: Run test to verify it passes**
Run: `npx tsx --test tests/preventive/bms-coverage-hierarchy-ui.test.ts`
Expected: PASS

---

### Task 4: Integrasi Tab "Coverage BMS" sebagai Default Tab di Checklist Preventif

**Files:**
- Modify: `app/dashboard/preventive/page.tsx`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- Test: `tests/preventive/preventive-tabs-integration.test.ts`

**Step 1: Write the failing test**
Create `tests/preventive/preventive-tabs-integration.test.ts`:
```typescript
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const pageSource = readFileSync("app/dashboard/preventive/page.tsx", "utf8");
const tableSource = readFileSync(
    "app/dashboard/preventive/_components/admin-preventive-table.tsx",
    "utf8",
);

test("page accepts coverage-bms and sets it as default tab", () => {
    assert.match(pageSource, /"coverage-bms"/);
    assert.match(pageSource, /initialTab\s*=\s*params\.tab\s*&&\s*VALID_TABS\.has\(params\.tab\)\s*\?\s*params\.tab\s*:\s*["']coverage-bms["']/);
});

test("admin preventive table includes coverage-bms tab as first tab", () => {
    assert.match(tableSource, /value=["']coverage-bms["']/);
    assert.match(tableSource, /Coverage BMS/);
});
```

**Step 2: Run test to verify it fails**
Run: `npx tsx --test tests/preventive/preventive-tabs-integration.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
1. Di `app/dashboard/preventive/page.tsx`:
   - Tambahkan `"coverage-bms"` ke `VALID_TABS`.
   - Ubah default `initialTab` menjadi `"coverage-bms"`.
   - Fetch initial hierarchy data via `getBmsCoverageHierarchy`.
   - Teruskan `initialCoverageHierarchy` ke `AdminPreventiveTable`.
2. Di `app/dashboard/preventive/_components/admin-preventive-table.tsx`:
   - Tambahkan `TabsTrigger` untuk `coverage-bms` di posisi **paling awal (pertama)** dengan icon `Users` atau `Network`.
   - Tambahkan `TabsContent value="coverage-bms"` yang merender `<BmsCoverageHierarchyTable ... />`.

**Step 4: Run test to verify it passes**
Run: `npx tsx --test tests/preventive/preventive-tabs-integration.test.ts`
Expected: PASS

---

### Task 5: Full Verification, Clean Build, dan Dokumentasi Task Note

**Files:**
- Modify: `docs/plans/task.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-bms-coverage-tab-hierarchy.md`

**Step 1: Run all unit tests**
Run: `npx tsx --test tests/**/*.test.ts`
Expected: Semua test pass (100%).

**Step 2: Run production build check**
Run: `npm run build:memory`
Expected: Exit code 0, 0 type errors, static pages generation clean.

**Step 3: Document task note**
Buat task note di `docs/agent-notes/` sesuai template `TEMPLATE.md` dan waktu Asia/Jakarta.

**Step 4: Update task progress**
Update `docs/plans/task.md` dengan status Done.
