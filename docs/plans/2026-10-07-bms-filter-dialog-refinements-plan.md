# BMS Store Filter & Coverage Detail Dialog Refinements Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Menghadirkan filter dropdown BMS terurut ascending di tabel data toko (`/dashboard/stores`) dan merapikan tampilan modal pop-up detail coverage toko di `/dashboard/bms-performance` (melebarkan pop-up dan menghilangkan double scrollbar).

**Architecture:** Mengintegrasikan opsi BMS aktif dari `getBmsOptionsByBranch` ke toolbar filter `AdminStoresTable` dengan sinkronisasi URL search params (`?bms=...`). Memperbaiki layout `BmsCoverageDetailDialog` dengan memperbesar batas maksimal lebar dialog (`lg:max-w-5xl w-[95vw]`), mengeliminasi konflik nested overflow scroll container antara wrapper `div` dan shadcn `Table`, serta merapikan hierarki tipografi dan badge status.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui (Dialog, Table, Select), Prisma 7.

---

### Task 1: Dropdown Filter BMS (Ascending) di Toolbar Manajemen Toko

**Files:**
- Modify: `app/dashboard/stores/page.tsx:24-94`
- Modify: `app/dashboard/stores/_components/admin-stores-table.tsx:150-410`
- Create: `tests/stores/store-bms-filter.test.ts`

**Step 1: Write the failing test**

Buat file `tests/stores/store-bms-filter.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const pageSource = readFileSync("app/dashboard/stores/page.tsx", "utf8");
const tableSource = readFileSync("app/dashboard/stores/_components/admin-stores-table.tsx", "utf8");
const actionsSource = readFileSync("app/dashboard/stores/actions.ts", "utf8");

test("stores page loads bms options and handles bms query param", () => {
    assert.match(pageSource, /bmsOptions/);
    assert.match(pageSource, /getBmsOptionsByBranch/);
    assert.match(pageSource, /initialBmsNIK/);
});

test("stores table renders bms select filter with ascending options", () => {
    assert.match(tableSource, /bmsNIK/);
    assert.match(tableSource, /Semua BMS/);
    assert.match(tableSource, /bmsOptions/);
});

test("getBmsOptionsByBranch orders by name asc", () => {
    assert.match(actionsSource, /orderBy:\s*\{\s*name:\s*["']asc["']\s*\}/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/stores/store-bms-filter.test.ts`
Expected: FAIL (karena `page.tsx` dan `admin-stores-table.tsx` belum mengintegrasikan `bmsOptions`).

**Step 3: Update `app/dashboard/stores/page.tsx`**

- Baca query param `bms?: string` dari `searchParams`.
- Panggil `getBmsOptionsByBranch` untuk mendapatkan opsi BMS (terurut ASC).
- Teruskan `bmsNIK: initialBmsNIK !== "all" ? initialBmsNIK : undefined` ke `getAdminStores`.
- Teruskan `bmsOptions` dan `initialBmsNIK` ke komponen `<AdminStoresTable />`.

**Step 4: Update `app/dashboard/stores/_components/admin-stores-table.tsx`**

- Terima props `bmsOptions: Array<{ NIK: string; name: string }>` dan `initialBmsNIK?: string`.
- Tambahkan state `bmsNIK` (default `initialBmsNIK ?? "all"`).
- Di `pushFilterToUrl`, sertakan `params.set("bms", resolvedBmsNIK)`.
- Ketika dropdown cabang berganti (`setBranchName`), fetch opsi BMS cabang baru via `getBmsOptionsByBranch` agar daftar BMS sinkron.
- Render elemen `<Select>` BMS di toolbar filter samping Branch/Area/Brand:
  - Nilai "all" -> label "Semua BMS"
  - Daftar opsi di-map dari `bmsOptions` yang sudah terurut ASC:
    `<SelectItem key={b.NIK} value={b.NIK}>{b.name} ({b.NIK})</SelectItem>`

**Step 5: Run test to verify it passes**

Run: `npx tsx --test tests/stores/store-bms-filter.test.ts`
Expected: PASS.

---

### Task 2: Perbaikan Tampilan Modal Popup Detail Toko (`BmsCoverageDetailDialog`)

**Files:**
- Modify: `app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx:65-195`
- Create: `tests/performance/bms-dialog-ui.test.ts`

**Step 1: Write the failing test**

Buat file `tests/performance/bms-dialog-ui.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const dialogSource = readFileSync(
    "app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx",
    "utf8",
);

test("dialog content uses widened max width", () => {
    assert.match(dialogSource, /max-w-4xl|max-w-5xl/);
});

test("dialog eliminates duplicate overflow scrollbars", () => {
    // Tidak boleh ada nested wrapper div dengan overflow-y-auto yang membungkus Table yang juga overflow
    assert.doesNotMatch(dialogSource, /overflow-y-auto border rounded-md min-h-\[300px\]/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/performance/bms-dialog-ui.test.ts`
Expected: FAIL.

**Step 3: Refactor `app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx`**

- Perlebar ukuran modal: Ganti `max-w-3xl` dengan `sm:max-w-4xl lg:max-w-5xl w-[95vw] max-h-[88vh] overflow-hidden`.
- Atasi scrollbar ganda:
  - Hapus class `overflow-y-auto` pada div pembungkus tabel.
  - Gunakan `containerClassName="max-h-[52vh] overflow-y-auto border rounded-md"` langsung pada komponen `<Table>`.
- Rapikan header dan tata letak:
  - Tampilkan ringkasan metrik (Total, Selesai, Pending) dengan badge kecil yang bersih.
  - Tambahkan kolom `Cabang` pada tabel toko jika datanya ada.
  - Atur padding, alignment teks, dan sticky header tabel dengan warna background `bg-muted/50`.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/performance/bms-dialog-ui.test.ts`
Expected: PASS.

---

### Task 3: Verifikasi Sistem, Type Check, dan Dokumentasi Task Note

**Files:**
- Modify: `docs/plans/task.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-bms-filter-dialog-refinements.md`

**Step 1: Run all test suites**

Run: `npx tsx --test tests/**/*.test.ts`
Expected: All tests PASS.

**Step 2: Run Next.js production build check**

Run: `npm run build:memory`
Expected: Exit code 0 (clean build).

**Step 3: Update documentation & task notes**

- Perbarui task checklist di `docs/plans/task.md`.
- Buat task note Asia/Jakarta time di `docs/agent-notes/`.
