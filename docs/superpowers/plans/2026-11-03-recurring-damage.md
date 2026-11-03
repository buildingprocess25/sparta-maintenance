# Kerusakan Berulang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah halaman `/dashboard/recurring-damage` ("Kerusakan Berulang") yang menampilkan toko dengan item checklist yang sama rusak ≥ 2x per periode, dengan drill-down Cabang → Toko → Item → Laporan dan export XLSX.

**Architecture:** Logic murni (deteksi rusak, periode, agregasi, ranking) di `lib/recurring-damage.ts` dan dikunci oleh spec. Query JSONB tanpa cek akses di `detections-query.ts`, dibungkus `queries.ts` (server-only) yang mengecek role dan cakupan cabang. Halaman server component dirender ulang lewat `router.replace` saat filter berubah; panel toko memakai `window.history.replaceState`. Export lewat API route POST memakai library `xlsx`, polanya sama dengan export matriks preventif.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 (`$queryRaw`), PostgreSQL JSONB, shadcn/ui (radix), lucide-react, `@tabler/icons-react` (sidebar), `xlsx`, `sonner`.

**Spec:** `docs/superpowers/specs/2026-11-03-recurring-damage-design.md`

## Global Constraints

- Deteksi rusak: `condition = 'RUSAK'` atau `preventiveCondition = 'NOT_OK'`. `BAIK`, `OK`, `TIDAK_ADA`, signage Kotor bukan deteksi.
- Status yang tidak dihitung: `DRAFT`, `ARCHIVED_PREVENTIVE`, `ESTIMATION_REJECTED`.
- Item berulang: ≥ 2 deteksi dari laporan berbeda untuk toko + `itemId` yang sama dalam periode.
- Cabang dari `Store.branchName` (cabang toko saat ini). Hanya toko `isActive = true`.
- Periode berbasis `Report.createdAt` WIB; bulan hanya valid bila kuartal dipilih dan bulan ada di kuartal itu.
- Urutan toko: frekuensi maksimum turun → jumlah item berulang turun → kode toko naik. Item teratas saat seri: urutan katalog (`compareChecklistItemIds`).
- Akses: `ADMIN` semua cabang kecuali `HEAD OFFICE` + filter brand; `BMC`/`BNM_MANAGER` hanya `branchNames[0]`, parameter `branch` dari URL/body diabaikan.
- Tanpa migrasi/tabel baru. Tidak mengubah `prisma/schema.prisma`.
- UI: komponen shadcn/ui dari `components/ui`, ikon lucide di halaman, class tabel/filter/badge sama persis dengan `app/dashboard/preventive/_components/admin-preventive-table.tsx`. Jangan menambah padding/margin/gap manual ke komponen shadcn; jarak diatur di wrapper (AI_RULES.md).
- Teks UI berbahasa Indonesia. Label tombol export: `Ekspor XLSX`. Istilah kuartal di UI: `Triwulan`.
- Spec dijalankan dengan `npx tsx <file>.spec.ts` (assert `node:assert/strict`, tanpa output bila lulus).
- Setiap commit yang mengubah file non-dokumentasi wajib ikut men-stage task note `docs/agent-notes/YYYY-MM-DD-HHMM-recurring-damage.md` (pre-commit hook `scripts/check-agent-task-note.mjs`). Jangan pakai `--no-verify`.
- Commit langsung di `main`. Jangan menambahkan baris `Co-Authored-By` atau atribusi AI di pesan commit.

## File Structure

| File | Status | Tanggung jawab |
|---|---|---|
| `lib/recurring-damage.ts` | Create | Tipe, aturan deteksi, status, periode, agregasi, ringkasan cabang (murni) |
| `lib/recurring-damage.spec.ts` | Create | Spec untuk semua fungsi di atas |
| `components/dashboard/metric-column.tsx` | Create | `MetricColumn` (dipindah dari halaman Preventif) |
| `components/dashboard/empty-table.tsx` | Create | `EmptyTable` (dipindah dari halaman Preventif) |
| `components/dashboard/report-status-badge.tsx` | Create | `ReportStatusBadge` (dipindah dari halaman Preventif) |
| `app/dashboard/preventive/_components/admin-preventive-table.tsx` | Modify | Pakai tiga komponen di atas, hapus salinan lokal |
| `app/dashboard/recurring-damage/detections-query.ts` | Create | Query SQL JSONB deteksi rusak (tanpa cek akses) |
| `app/dashboard/recurring-damage/queries.ts` | Create | `loadRecurringDamage`: auth, cakupan, panggil query + agregasi |
| `app/dashboard/recurring-damage/page.tsx` | Create | Server component halaman |
| `app/dashboard/recurring-damage/_components/recurring-damage-view.tsx` | Create | Layout halaman, navigasi filter, state panel toko |
| `app/dashboard/recurring-damage/_components/recurring-damage-filters.tsx` | Create | Select Brand/Cabang/Triwulan/Bulan/Tahun |
| `app/dashboard/recurring-damage/_components/recurring-branch-table.tsx` | Create | Layer 1 tabel cabang (Admin) |
| `app/dashboard/recurring-damage/_components/recurring-store-table.tsx` | Create | Layer 2 tabel toko + pencarian |
| `app/dashboard/recurring-damage/_components/recurring-store-sheet.tsx` | Create | Layer 3–4 panel samping |
| `app/dashboard/recurring-damage/_components/export-recurring-damage-button.tsx` | Create | Tombol `Ekspor XLSX` |
| `app/api/dashboard/recurring-damage/export/route.ts` | Create | Endpoint POST XLSX |
| `components/app-sidebar.tsx` | Modify | Menu "Kerusakan Berulang" di grup Monitoring |
| `CLAUDE.md` | Modify | Catatan perilaku fitur di bagian Notes |
| `docs/agent-notes/YYYY-MM-DD-HHMM-recurring-damage.md` | Create | Task note (diperbarui tiap task) |

---

### Task 1: Aturan deteksi, status, dan periode

**Files:**
- Create: `lib/recurring-damage.ts`
- Create: `lib/recurring-damage.spec.ts`
- Create: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Consumes: `getJakartaYearWindow`, `getJakartaQuarterWindow`, `getJakartaMonthWindow` dari `lib/time.ts` (masing-masing mengembalikan `{ start: Date; endExclusive: Date }`); tipe `StoreBrandFilter` dari `lib/store-brand-filter.ts`.
- Produces:
  - `type RecurringDamageQuarter = 1 | 2 | 3 | 4`
  - `type RecurringDamagePeriod = { year: number; quarter?: RecurringDamageQuarter; month?: number }`
  - `type RecurringDamageFilters = RecurringDamagePeriod & { branchName?: string; brand?: StoreBrandFilter }`
  - `const RECURRING_DAMAGE_EXCLUDED_STATUSES: readonly ["DRAFT", "ARCHIVED_PREVENTIVE", "ESTIMATION_REJECTED"]`
  - `isRecurringDamageCountedStatus(status: string): boolean`
  - `isDamagedItem(item: { condition?: string | null; preventiveCondition?: string | null }): boolean`
  - `RECURRING_DAMAGE_QUARTER_MONTHS: Record<RecurringDamageQuarter, readonly number[]>`
  - `RECURRING_DAMAGE_MONTH_LABELS: readonly string[]` (index 0 = Januari)
  - `isRecurringDamageQuarter(value: unknown): value is RecurringDamageQuarter`
  - `isValidRecurringDamagePeriod(period: { year: number; quarter?: number; month?: number }): period is RecurringDamagePeriod`
  - `normalizeRecurringDamagePeriod(raw: { year?: string; quarter?: string; month?: string }, currentYear: number): RecurringDamagePeriod`
  - `getRecurringDamageWindow(period: RecurringDamagePeriod): { start: Date; endExclusive: Date }`
  - `formatRecurringDamagePeriod(period: RecurringDamagePeriod): string`

- [ ] **Step 1: Write the failing test**

Create `lib/recurring-damage.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    formatRecurringDamagePeriod,
    getRecurringDamageWindow,
    isDamagedItem,
    isRecurringDamageCountedStatus,
    isValidRecurringDamagePeriod,
    normalizeRecurringDamagePeriod,
} from "./recurring-damage";
import {
    getJakartaMonthWindow,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
} from "./time";

// Deteksi rusak: A–H memakai `condition`, I memakai `preventiveCondition`.
assert.equal(isDamagedItem({ condition: "RUSAK", preventiveCondition: null }), true);
assert.equal(isDamagedItem({ condition: "BAIK", preventiveCondition: null }), false);
assert.equal(isDamagedItem({ condition: "TIDAK_ADA", preventiveCondition: null }), false);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "NOT_OK" }), true);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "OK" }), false);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "TIDAK_ADA" }), false);
assert.equal(isDamagedItem({}), false);

// Signage I11–I13: Pudar/Rusak tersimpan NOT_OK, Baik/Kotor tersimpan OK.
const signagePudar = { itemId: "I11", preventiveCondition: "NOT_OK", signageCondition: "PUDAR" };
const signageRusak = { itemId: "I12", preventiveCondition: "NOT_OK", signageCondition: "RUSAK" };
const signageKotor = { itemId: "I13", preventiveCondition: "OK", signageCondition: "KOTOR" };
const signageBaik = { itemId: "I13", preventiveCondition: "OK", signageCondition: "BAIK" };
assert.equal(isDamagedItem(signagePudar), true);
assert.equal(isDamagedItem(signageRusak), true);
assert.equal(isDamagedItem(signageKotor), false);
assert.equal(isDamagedItem(signageBaik), false);

// Status yang dihitung.
assert.deepEqual(
    [...RECURRING_DAMAGE_EXCLUDED_STATUSES],
    ["DRAFT", "ARCHIVED_PREVENTIVE", "ESTIMATION_REJECTED"],
);
for (const status of RECURRING_DAMAGE_EXCLUDED_STATUSES) {
    assert.equal(isRecurringDamageCountedStatus(status), false, status);
}
for (const status of [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
]) {
    assert.equal(isRecurringDamageCountedStatus(status), true, status);
}

// Validasi periode: bulan hanya bila kuartal dipilih dan bulan ada di kuartal itu.
assert.equal(isValidRecurringDamagePeriod({ year: 2026 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2, month: 5 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2, month: 7 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, month: 5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026.5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 1999 }), false);

// Normalisasi query string halaman: nilai tidak valid dibuang.
assert.deepEqual(normalizeRecurringDamagePeriod({}, 2026), { year: 2026 });
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", quarter: "3", month: "8" }, 2026),
    { year: 2025, quarter: 3, month: 8 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", quarter: "3", month: "2" }, 2026),
    { year: 2025, quarter: 3 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", month: "2" }, 2026),
    { year: 2025 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "1999", quarter: "9" }, 2026),
    { year: 2026 },
);

// Rentang waktu WIB.
assert.deepEqual(getRecurringDamageWindow({ year: 2026 }), getJakartaYearWindow(2026));
assert.deepEqual(
    getRecurringDamageWindow({ year: 2026, quarter: 2 }),
    getJakartaQuarterWindow(2026, 2),
);
assert.deepEqual(
    getRecurringDamageWindow({ year: 2026, quarter: 2, month: 5 }),
    getJakartaMonthWindow(2026, 5),
);

// Label periode.
assert.equal(formatRecurringDamagePeriod({ year: 2026 }), "Tahun 2026");
assert.equal(formatRecurringDamagePeriod({ year: 2026, quarter: 2 }), "Triwulan 2 2026");
assert.equal(formatRecurringDamagePeriod({ year: 2026, quarter: 2, month: 5 }), "Mei 2026");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/recurring-damage.spec.ts`
Expected: FAIL, error `Cannot find module './recurring-damage'` (atau `ERR_MODULE_NOT_FOUND`).

- [ ] **Step 3: Write minimal implementation**

Create `lib/recurring-damage.ts`:

```ts
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import {
    getJakartaMonthWindow,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
} from "@/lib/time";

export type RecurringDamageQuarter = 1 | 2 | 3 | 4;

export type RecurringDamagePeriod = {
    year: number;
    quarter?: RecurringDamageQuarter;
    month?: number;
};

export type RecurringDamageFilters = RecurringDamagePeriod & {
    branchName?: string;
    brand?: StoreBrandFilter;
};

/** Laporan dengan status ini tidak dihitung sebagai deteksi kerusakan. */
export const RECURRING_DAMAGE_EXCLUDED_STATUSES = [
    "DRAFT",
    "ARCHIVED_PREVENTIVE",
    "ESTIMATION_REJECTED",
] as const;

const excludedStatuses = new Set<string>(RECURRING_DAMAGE_EXCLUDED_STATUSES);

export function isRecurringDamageCountedStatus(status: string): boolean {
    return !excludedStatuses.has(status);
}

/**
 * Rusak = item A–H `RUSAK` atau item I `NOT_OK`. Signage Pudar/Rusak sudah
 * tersimpan sebagai `NOT_OK`, Kotor sebagai `OK`.
 */
export function isDamagedItem(item: {
    condition?: string | null;
    preventiveCondition?: string | null;
}): boolean {
    return item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";
}

export const RECURRING_DAMAGE_QUARTER_MONTHS: Record<
    RecurringDamageQuarter,
    readonly number[]
> = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
};

export const RECURRING_DAMAGE_MONTH_LABELS: readonly string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

export function isRecurringDamageQuarter(
    value: unknown,
): value is RecurringDamageQuarter {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

/** Bulan hanya valid bila kuartal dipilih dan bulan berada di kuartal itu. */
export function isValidRecurringDamagePeriod(period: {
    year: number;
    quarter?: number;
    month?: number;
}): period is RecurringDamagePeriod {
    if (!Number.isInteger(period.year) || period.year < 2000 || period.year > 2200) {
        return false;
    }
    if (period.quarter === undefined) return period.month === undefined;
    if (!isRecurringDamageQuarter(period.quarter)) return false;
    return (
        period.month === undefined ||
        RECURRING_DAMAGE_QUARTER_MONTHS[period.quarter].includes(period.month)
    );
}

/** Dari query string halaman: nilai yang tidak valid dibuang, bukan ditolak. */
export function normalizeRecurringDamagePeriod(
    raw: { year?: string; quarter?: string; month?: string },
    currentYear: number,
): RecurringDamagePeriod {
    const rawYear = Number(raw.year);
    const year =
        Number.isInteger(rawYear) && rawYear >= 2020 && rawYear <= currentYear + 1
            ? rawYear
            : currentYear;

    const quarter = Number(raw.quarter);
    if (!isRecurringDamageQuarter(quarter)) return { year };

    const month = Number(raw.month);
    return RECURRING_DAMAGE_QUARTER_MONTHS[quarter].includes(month)
        ? { year, quarter, month }
        : { year, quarter };
}

export function getRecurringDamageWindow(period: RecurringDamagePeriod): {
    start: Date;
    endExclusive: Date;
} {
    if (period.month !== undefined) {
        return getJakartaMonthWindow(period.year, period.month);
    }
    if (period.quarter !== undefined) {
        return getJakartaQuarterWindow(period.year, period.quarter);
    }
    return getJakartaYearWindow(period.year);
}

export function formatRecurringDamagePeriod(period: RecurringDamagePeriod): string {
    if (period.month !== undefined) {
        return `${RECURRING_DAMAGE_MONTH_LABELS[period.month - 1]} ${period.year}`;
    }
    if (period.quarter !== undefined) {
        return `Triwulan ${period.quarter} ${period.year}`;
    }
    return `Tahun ${period.year}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/recurring-damage.spec.ts`
Expected: tidak ada output, exit code 0.

- [ ] **Step 5: Create the task note**

Hitung stamp waktu Jakarta (simpan hasilnya; semua task berikutnya memakai path yang sama):

```bash
node -e "const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t).value;console.log(g('year')+'-'+g('month')+'-'+g('day')+'-'+g('hour')+g('minute'))"
```

Create `docs/agent-notes/<STAMP>-recurring-damage.md` (ganti `<STAMP>` dengan output di atas):

```markdown
# Kerusakan Berulang

## Scope

Halaman baru `/dashboard/recurring-damage` (Admin, BMC, BNM): toko dengan
item checklist yang sama rusak ≥ 2x per periode, drill-down Cabang → Toko →
Item → Laporan, dan export XLSX. Tanpa perubahan schema. Akses BMS, Branch
Admin, dan metrik "rusak lagi setelah diperbaiki" di luar cakupan.

## Context and Sources

- Spec: `docs/superpowers/specs/2026-11-03-recurring-damage-design.md`
- Plan: `docs/superpowers/plans/2026-11-03-recurring-damage.md`
- Pola acuan: `app/dashboard/preventive/` dan
  `app/api/dashboard/preventive/annual-matrix-export/route.ts`

## Changed Files

- `lib/recurring-damage.ts`: aturan deteksi rusak, status yang dihitung, filter periode.
- `lib/recurring-damage.spec.ts`: spec fungsi murni.

## Decisions

- Deteksi rusak memakai aturan yang sama dengan seluruh aplikasi
  (`RUSAK` / `NOT_OK`); signage Pudar ikut rusak.
- `ESTIMATION_REJECTED` dan `ARCHIVED_PREVENTIVE` tidak dihitung.

## Verification

- `npx tsx lib/recurring-damage.spec.ts`: lulus.

## Remaining Work and Risks

- Agregasi, query, halaman, dan export belum dibuat (task berikutnya).
```

- [ ] **Step 6: Commit**

```bash
git add lib/recurring-damage.ts lib/recurring-damage.spec.ts docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "feat(recurring-damage): add damage and period rules"
```

---

### Task 2: Agregasi toko problematik dan ringkasan cabang

**Files:**
- Modify: `lib/recurring-damage.ts`
- Modify: `lib/recurring-damage.spec.ts`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Consumes: `isDamagedItem`, `isRecurringDamageCountedStatus` (Task 1); `compareChecklistItemIds(a: string, b: string): number` dan `resolveChecklistItemMeta({ itemId }): { itemName: string; categoryName: string }` dari `lib/checklist-data.ts`.
- Produces:
  - `type DamageDetection = { branchName: string; storeCode: string; storeName: string; reportNumber: string; createdAt: string /* ISO */; status: string; itemId: string; condition: string | null; preventiveCondition: string | null; handler: string | null; notes: string | null; signageCondition: string | null; signageMaterial: string | null }`
  - `type RecurringDamageDetection = { reportNumber: string; createdAt: string; status: string; handler: string | null; notes: string | null; signageCondition: string | null; signageMaterial: string | null }`
  - `type RecurringDamageItem = { itemId: string; itemName: string; categoryName: string; count: number; detections: RecurringDamageDetection[] }`
  - `type RecurringDamageStore = { branchName: string; storeCode: string; storeName: string; maxFrequency: number; topItemId: string; topItemName: string; recurringItemCount: number; items: RecurringDamageItem[] }`
  - `type RecurringDamageBranchSummary = { branchName: string; problematicStoreCount: number }`
  - `type RecurringDamageData = { branches: RecurringDamageBranchSummary[]; stores: RecurringDamageStore[] }`
  - `buildRecurringDamageStores(detections: readonly DamageDetection[]): RecurringDamageStore[]`
  - `summarizeRecurringDamageBranches(branchNames: readonly string[], stores: readonly RecurringDamageStore[]): RecurringDamageBranchSummary[]`

- [ ] **Step 1: Write the failing test**

Di `lib/recurring-damage.spec.ts`, ubah import paling atas dari `./recurring-damage` menjadi:

```ts
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    buildRecurringDamageStores,
    formatRecurringDamagePeriod,
    getRecurringDamageWindow,
    isDamagedItem,
    isRecurringDamageCountedStatus,
    isValidRecurringDamagePeriod,
    normalizeRecurringDamagePeriod,
    summarizeRecurringDamageBranches,
    type DamageDetection,
} from "./recurring-damage";
```

Lalu tambahkan di akhir file:

```ts
// ── Agregasi ──────────────────────────────────────────────────────────────
const baseDetection: DamageDetection = {
    branchName: "CIANJUR",
    storeCode: "T001",
    storeName: "Toko Satu",
    reportNumber: "R-1",
    createdAt: "2026-02-01T03:00:00.000Z",
    status: "COMPLETED",
    itemId: "A5",
    condition: "RUSAK",
    preventiveCondition: null,
    handler: "BMS",
    notes: null,
    signageCondition: null,
    signageMaterial: null,
};
const detection = (overrides: Partial<DamageDetection>): DamageDetection => ({
    ...baseDetection,
    ...overrides,
});

// Rusak 1x bukan berulang.
assert.deepEqual(buildRecurringDamageStores([detection({})]), []);

// Item yang sama dua kali di satu laporan tetap 1 deteksi.
assert.deepEqual(buildRecurringDamageStores([detection({}), detection({})]), []);

// Status dikecualikan dan item tidak rusak diabaikan.
assert.deepEqual(
    buildRecurringDamageStores([
        detection({}),
        detection({ reportNumber: "R-2", status: "ESTIMATION_REJECTED" }),
        detection({ reportNumber: "R-3", status: "DRAFT" }),
        detection({ reportNumber: "R-4", status: "ARCHIVED_PREVENTIVE" }),
        detection({ reportNumber: "R-5", condition: "BAIK" }),
    ]),
    [],
);

// TX: A5 4x (input sengaja terbalik untuk menguji urutan tanggal).
// TZ: A2 3x dan A1 3x (seri → A1 jadi item teratas).
// TY: A5, B3, D1 masing-masing 2x, E1 1x (tidak tampil).
// TV: A6 2x, TW: A5 2x (seri penuh → urut kode toko).
const detections: DamageDetection[] = [
    ...["R-4", "R-3", "R-2", "R-1"].map((reportNumber, index) =>
        detection({
            storeCode: "TX",
            storeName: "Toko X",
            reportNumber,
            createdAt: `2026-0${4 - index}-01T03:00:00.000Z`,
            handler: index === 0 ? "REKANAN" : "BMS",
        }),
    ),
    ...["A2", "A1"].flatMap((itemId) =>
        ["R-20", "R-21", "R-22"].map((reportNumber) =>
            detection({
                branchName: "BOGOR",
                storeCode: "TZ",
                storeName: "Toko Z",
                itemId,
                reportNumber,
            }),
        ),
    ),
    ...["A5", "B3", "D1"].flatMap((itemId) =>
        ["R-10", "R-11"].map((reportNumber) =>
            detection({ storeCode: "TY", storeName: "Toko Y", itemId, reportNumber }),
        ),
    ),
    detection({ storeCode: "TY", storeName: "Toko Y", itemId: "E1", reportNumber: "R-12" }),
    ...["R-30", "R-31"].map((reportNumber) =>
        detection({ storeCode: "TW", storeName: "Toko W", reportNumber }),
    ),
    ...["R-40", "R-41"].map((reportNumber) =>
        detection({ storeCode: "TV", storeName: "Toko V", itemId: "A6", reportNumber }),
    ),
];

const stores = buildRecurringDamageStores(detections);

assert.deepEqual(
    stores.map((store) => [
        store.storeCode,
        store.maxFrequency,
        store.recurringItemCount,
        store.topItemId,
    ]),
    [
        ["TX", 4, 1, "A5"],
        ["TZ", 3, 2, "A1"],
        ["TY", 2, 3, "A5"],
        ["TV", 2, 1, "A6"],
        ["TW", 2, 1, "A5"],
    ],
);

const storeX = stores[0];
assert.equal(storeX.branchName, "CIANJUR");
assert.equal(storeX.storeName, "Toko X");
assert.equal(storeX.topItemName, "Lampu Shop Sign");
assert.equal(storeX.items[0].itemName, "Lampu Shop Sign");
assert.equal(storeX.items[0].categoryName, "A. Bagian Depan Bangunan");
assert.equal(storeX.items[0].count, 4);
assert.deepEqual(
    storeX.items[0].detections.map((item) => item.reportNumber),
    ["R-1", "R-2", "R-3", "R-4"],
);
assert.equal(storeX.items[0].detections[3].handler, "REKANAN");

assert.deepEqual(
    stores[1].items.map((item) => [item.itemId, item.count]),
    [
        ["A1", 3],
        ["A2", 3],
    ],
);
assert.deepEqual(
    stores[2].items.map((item) => item.itemId),
    ["A5", "B3", "D1"],
);

// Ringkasan cabang: urut jumlah toko problematik turun, lalu nama cabang.
assert.deepEqual(
    summarizeRecurringDamageBranches(["SUKABUMI", "BOGOR", "CIANJUR"], stores),
    [
        { branchName: "CIANJUR", problematicStoreCount: 4 },
        { branchName: "BOGOR", problematicStoreCount: 1 },
        { branchName: "SUKABUMI", problematicStoreCount: 0 },
    ],
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/recurring-damage.spec.ts`
Expected: FAIL, `TypeError: buildRecurringDamageStores is not a function` (atau `SyntaxError ... does not provide an export named 'buildRecurringDamageStores'`).

- [ ] **Step 3: Write minimal implementation**

Di `lib/recurring-damage.ts`, tambahkan import di baris paling atas file:

```ts
import {
    compareChecklistItemIds,
    resolveChecklistItemMeta,
} from "@/lib/checklist-data";
```

Lalu tambahkan di akhir file:

```ts
/** Satu entri item rusak dari satu laporan (hasil query). */
export type DamageDetection = {
    branchName: string;
    storeCode: string;
    storeName: string;
    reportNumber: string;
    createdAt: string;
    status: string;
    itemId: string;
    condition: string | null;
    preventiveCondition: string | null;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

export type RecurringDamageDetection = {
    reportNumber: string;
    createdAt: string;
    status: string;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

export type RecurringDamageItem = {
    itemId: string;
    itemName: string;
    categoryName: string;
    count: number;
    detections: RecurringDamageDetection[];
};

export type RecurringDamageStore = {
    branchName: string;
    storeCode: string;
    storeName: string;
    maxFrequency: number;
    topItemId: string;
    topItemName: string;
    recurringItemCount: number;
    items: RecurringDamageItem[];
};

export type RecurringDamageBranchSummary = {
    branchName: string;
    problematicStoreCount: number;
};

export type RecurringDamageData = {
    branches: RecurringDamageBranchSummary[];
    stores: RecurringDamageStore[];
};

type StoreAccumulator = {
    branchName: string;
    storeName: string;
    reportsByItem: Map<string, Map<string, RecurringDamageDetection>>;
};

/**
 * Kelompokkan deteksi per toko dan item, ambil item dengan ≥ 2 laporan, lalu
 * urutkan toko: frekuensi maksimum, jumlah item berulang, kode toko.
 */
export function buildRecurringDamageStores(
    detections: readonly DamageDetection[],
): RecurringDamageStore[] {
    const byStore = new Map<string, StoreAccumulator>();

    for (const detection of detections) {
        if (!isDamagedItem(detection)) continue;
        if (!isRecurringDamageCountedStatus(detection.status)) continue;

        let store = byStore.get(detection.storeCode);
        if (!store) {
            store = {
                branchName: detection.branchName,
                storeName: detection.storeName,
                reportsByItem: new Map(),
            };
            byStore.set(detection.storeCode, store);
        }

        let reports = store.reportsByItem.get(detection.itemId);
        if (!reports) {
            reports = new Map();
            store.reportsByItem.set(detection.itemId, reports);
        }

        if (!reports.has(detection.reportNumber)) {
            reports.set(detection.reportNumber, {
                reportNumber: detection.reportNumber,
                createdAt: detection.createdAt,
                status: detection.status,
                handler: detection.handler,
                notes: detection.notes,
                signageCondition: detection.signageCondition,
                signageMaterial: detection.signageMaterial,
            });
        }
    }

    const stores: RecurringDamageStore[] = [];

    for (const [storeCode, store] of byStore) {
        const items: RecurringDamageItem[] = [...store.reportsByItem]
            .filter(([, reports]) => reports.size >= 2)
            .map(([itemId, reports]) => {
                const meta = resolveChecklistItemMeta({ itemId });
                const itemDetections = [...reports.values()].sort(
                    (a, b) =>
                        a.createdAt.localeCompare(b.createdAt) ||
                        a.reportNumber.localeCompare(b.reportNumber),
                );
                return {
                    itemId,
                    itemName: meta.itemName,
                    categoryName: meta.categoryName,
                    count: itemDetections.length,
                    detections: itemDetections,
                };
            })
            .sort(
                (a, b) =>
                    b.count - a.count || compareChecklistItemIds(a.itemId, b.itemId),
            );

        if (items.length === 0) continue;

        const [topItem] = items;
        stores.push({
            branchName: store.branchName,
            storeCode,
            storeName: store.storeName,
            maxFrequency: topItem.count,
            topItemId: topItem.itemId,
            topItemName: topItem.itemName,
            recurringItemCount: items.length,
            items,
        });
    }

    return stores.sort(
        (a, b) =>
            b.maxFrequency - a.maxFrequency ||
            b.recurringItemCount - a.recurringItemCount ||
            a.storeCode.localeCompare(b.storeCode),
    );
}

/** Jumlah toko problematik per cabang; cabang tanpa toko problematik tetap 0. */
export function summarizeRecurringDamageBranches(
    branchNames: readonly string[],
    stores: readonly RecurringDamageStore[],
): RecurringDamageBranchSummary[] {
    const counts = new Map<string, number>(branchNames.map((name) => [name, 0]));
    for (const store of stores) {
        counts.set(store.branchName, (counts.get(store.branchName) ?? 0) + 1);
    }

    return [...counts]
        .map(([branchName, problematicStoreCount]) => ({
            branchName,
            problematicStoreCount,
        }))
        .sort(
            (a, b) =>
                b.problematicStoreCount - a.problematicStoreCount ||
                a.branchName.localeCompare(b.branchName),
        );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/recurring-damage.spec.ts`
Expected: tidak ada output, exit code 0.

- [ ] **Step 5: Update the task note**

Di `docs/agent-notes/<STAMP>-recurring-damage.md`:
- `## Changed Files`: ubah baris `lib/recurring-damage.ts` menjadi `` - `lib/recurring-damage.ts`: aturan deteksi rusak, status yang dihitung, filter periode, agregasi toko problematik, dan ringkasan cabang. ``
- `## Decisions`: tambah `- Item teratas saat seri memakai urutan katalog (compareChecklistItemIds); ringkasan cabang diurutkan dari jumlah toko problematik terbanyak.`
- `## Remaining Work and Risks`: ganti menjadi `- Query, halaman, dan export belum dibuat (task berikutnya).`

- [ ] **Step 6: Commit**

```bash
git add lib/recurring-damage.ts lib/recurring-damage.spec.ts docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "feat(recurring-damage): aggregate problematic stores"
```

---

### Task 3: Komponen dashboard bersama

Pindahkan `MetricColumn`, `EmptyTable`, dan `ReportStatusBadge` dari halaman Preventif ke `components/dashboard/` tanpa mengubah markup/class, lalu halaman Preventif memakainya. Halaman baru (Task 5) memakai komponen yang sama sehingga tampilannya identik.

**Files:**
- Create: `components/dashboard/metric-column.tsx`
- Create: `components/dashboard/empty-table.tsx`
- Create: `components/dashboard/report-status-badge.tsx`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Produces:
  - `MetricColumn({ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" })`
  - `EmptyTable({ icon: LucideIcon; title: string; description: string })`
  - `ReportStatusBadge({ status: string })`

- [ ] **Step 1: Create `components/dashboard/metric-column.tsx`**

```tsx
import { cn } from "@/lib/utils";

export type MetricTone = "default" | "good" | "warn" | "bad";

export function MetricColumn({
    label,
    value,
    tone = "default",
}: {
    label: string;
    value: string;
    tone?: MetricTone;
}) {
    return (
        <div className="min-w-0 border-b px-3 py-2 md:border-b-0 md:border-r last:md:border-r-0">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    "mt-0.5 truncate text-lg font-semibold",
                    tone === "good" && "text-emerald-700",
                    tone === "warn" && "text-amber-700",
                    tone === "bad" && "text-red-700",
                )}
            >
                {value}
            </p>
        </div>
    );
}
```

- [ ] **Step 2: Create `components/dashboard/empty-table.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function EmptyTable({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return (
        <Empty className="border-0 py-12">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
```

- [ ] **Step 3: Create `components/dashboard/report-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";

export function ReportStatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="secondary"
            className={cn("h-5 text-[11px]", getReportStatusBadgeClass(status))}
        >
            {getReportStatusLabel(status)}
        </Badge>
    );
}
```

- [ ] **Step 4: Switch the Preventif table to the shared components**

Di `app/dashboard/preventive/_components/admin-preventive-table.tsx`:

1. Hapus fungsi lokal `MetricColumn` (blok `function MetricColumn({ ... }) { ... }`), `ReportStatusBadge` (blok `function ReportStatusBadge({ status }: { status: string }) { ... }`), dan `EmptyTable` (blok `function EmptyTable({ ... }) { ... }`). Jangan hapus `CompletionBadge` dan `QuarterCell`.
2. Hapus import yang hanya dipakai fungsi tadi:
   - baris `import type { LucideIcon } from "lucide-react";`
   - seluruh blok `import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";`
   - blok `import { getReportStatusBadgeClass, getReportStatusLabel } from "@/lib/report-status";`
3. Tambahkan setelah import `BmsCoverageHierarchyTable`:

```tsx
import { EmptyTable } from "@/components/dashboard/empty-table";
import { MetricColumn } from "@/components/dashboard/metric-column";
import { ReportStatusBadge } from "@/components/dashboard/report-status-badge";
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: tanpa error.

Run: `npx eslint app/dashboard/preventive/_components/admin-preventive-table.tsx components/dashboard`
Expected: 0 error. Warning yang sudah ada sebelumnya di file Preventif boleh tetap ada; tidak boleh ada warning `is defined but never used` baru untuk `cn`, `Badge`, atau ikon lucide (keduanya masih dipakai `CompletionBadge`/tab).

Run: `git diff --stat app/dashboard/preventive/_components/admin-preventive-table.tsx`
Expected: hanya baris yang dihapus/ditambah sesuai Step 4.

- [ ] **Step 6: Update the task note**

Di `## Changed Files` tambahkan:

```markdown
- `components/dashboard/metric-column.tsx`, `empty-table.tsx`, `report-status-badge.tsx`: komponen dipindah dari halaman Preventif tanpa perubahan markup.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: memakai komponen bersama, salinan lokal dihapus.
```

Di `## Verification` tambahkan `- npx tsc --noEmit dan eslint pada file Preventif: tanpa error baru.`

- [ ] **Step 7: Commit**

```bash
git add components/dashboard app/dashboard/preventive/_components/admin-preventive-table.tsx docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "refactor(dashboard): share metric, empty, status badge"
```

---

### Task 4: Query deteksi dan pemuatan data berakses

**Files:**
- Create: `app/dashboard/recurring-damage/detections-query.ts`
- Create: `app/dashboard/recurring-damage/queries.ts`
- Temporary (tidak di-commit): `scripts/tmp-check-recurring-damage.ts`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Consumes: `RECURRING_DAMAGE_EXCLUDED_STATUSES`, `DamageDetection`, `buildRecurringDamageStores`, `summarizeRecurringDamageBranches`, `getRecurringDamageWindow`, `RecurringDamageFilters`, `RecurringDamageData` (Task 1–2); `getAuthUser(): Promise<AuthUser | null>` dari `lib/authorization.ts`; `EXCLUDED_ADMIN_BRANCH_NAME` dari `lib/admin-branch-scope.ts`; `getStoreBrandWhere(brand: StoreBrandFilter): Prisma.StoreWhereInput | undefined`; `logger` dari `lib/logger.ts`.
- Produces:
  - `type DetectionStoreRef = { code: string; name: string; branchName: string }`
  - `fetchDamageDetections(input: { stores: readonly DetectionStoreRef[]; start: Date; endExclusive: Date }): Promise<DamageDetection[]>`
  - `loadRecurringDamage(filters: RecurringDamageFilters): Promise<RecurringDamageData>` — melempar `Error("Unauthorized")` bila user tidak login atau role bukan ADMIN/BMC/BNM_MANAGER.

- [ ] **Step 1: Create `app/dashboard/recurring-damage/detections-query.ts`**

```ts
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    type DamageDetection,
} from "@/lib/recurring-damage";

export type DetectionStoreRef = {
    code: string;
    name: string;
    branchName: string;
};

type DetectionRow = {
    reportNumber: string;
    storeCode: string;
    createdAt: Date;
    status: string;
    itemId: string | null;
    condition: string | null;
    preventiveCondition: string | null;
    handler: string | null;
    notes: string | null;
    signageCondition: string | null;
    signageMaterial: string | null;
};

/**
 * Entri item rusak dari laporan yang dihitung, untuk toko dan rentang
 * `createdAt` yang diberikan. Tidak mengecek akses; pemanggil wajib
 * membatasi `stores` ke cakupan user.
 */
export async function fetchDamageDetections(input: {
    stores: readonly DetectionStoreRef[];
    start: Date;
    endExclusive: Date;
}): Promise<DamageDetection[]> {
    if (input.stores.length === 0) return [];

    const storeByCode = new Map(input.stores.map((store) => [store.code, store]));

    const rows = await prisma.$queryRaw<DetectionRow[]>`
        SELECT
            r."reportNumber",
            r."storeCode",
            r."createdAt",
            r."status"::text AS "status",
            item->>'itemId' AS "itemId",
            item->>'condition' AS "condition",
            item->>'preventiveCondition' AS "preventiveCondition",
            item->>'handler' AS "handler",
            item->>'notes' AS "notes",
            item->>'signageCondition' AS "signageCondition",
            item->>'signageMaterial' AS "signageMaterial"
        FROM "Report" r
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(r."items") = 'array' THEN r."items"
                ELSE '[]'::jsonb
            END
        ) AS item
        WHERE r."storeCode" IN (${Prisma.join(input.stores.map((store) => store.code))})
          AND r."createdAt" >= ${input.start}
          AND r."createdAt" < ${input.endExclusive}
          AND r."status"::text NOT IN (${Prisma.join([...RECURRING_DAMAGE_EXCLUDED_STATUSES])})
          AND (
            item->>'condition' = 'RUSAK'
            OR item->>'preventiveCondition' = 'NOT_OK'
          )
    `;

    return rows.flatMap((row) => {
        const store = storeByCode.get(row.storeCode);
        if (!store || !row.itemId) return [];

        return [
            {
                branchName: store.branchName,
                storeCode: row.storeCode,
                storeName: store.name,
                reportNumber: row.reportNumber,
                createdAt: row.createdAt.toISOString(),
                status: row.status,
                itemId: row.itemId,
                condition: row.condition,
                preventiveCondition: row.preventiveCondition,
                handler: row.handler,
                notes: row.notes,
                signageCondition: row.signageCondition,
                signageMaterial: row.signageMaterial,
            },
        ];
    });
}
```

- [ ] **Step 2: Create `app/dashboard/recurring-damage/queries.ts`**

```ts
import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getAuthUser, type AuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import {
    buildRecurringDamageStores,
    getRecurringDamageWindow,
    summarizeRecurringDamageBranches,
    type RecurringDamageData,
    type RecurringDamageFilters,
} from "@/lib/recurring-damage";
import { getStoreBrandWhere } from "@/lib/store-brand-filter";
import { fetchDamageDetections } from "./detections-query";

/** Cakupan toko aktif per role; `null` berarti user tidak punya cabang. */
function getStoreScope(
    user: AuthUser,
    filters: RecurringDamageFilters,
): Prisma.StoreWhereInput | null {
    if (user.role === "ADMIN") {
        const branchName =
            filters.branchName && filters.branchName !== "all"
                ? filters.branchName
                : undefined;
        const brandWhere = filters.brand
            ? getStoreBrandWhere(filters.brand)
            : undefined;

        return {
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
                ...(branchName ? { equals: branchName } : {}),
            },
            ...(brandWhere ?? {}),
        };
    }

    // BMC/BNM terikat ke satu cabang; filter cabang dari klien diabaikan.
    const branchName = user.branchNames[0];
    return branchName ? { branchName } : null;
}

export async function loadRecurringDamage(
    filters: RecurringDamageFilters,
): Promise<RecurringDamageData> {
    const user = await getAuthUser();
    if (
        !user ||
        (user.role !== "ADMIN" &&
            user.role !== "BMC" &&
            user.role !== "BNM_MANAGER")
    ) {
        throw new Error("Unauthorized");
    }

    const scope = getStoreScope(user, filters);
    if (!scope) return { branches: [], stores: [] };

    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true, ...scope },
            select: { code: true, name: true, branchName: true },
        });

        const { start, endExclusive } = getRecurringDamageWindow(filters);
        const detections = await fetchDamageDetections({
            stores,
            start,
            endExclusive,
        });
        const recurringStores = buildRecurringDamageStores(detections);
        const branchNames = [...new Set(stores.map((store) => store.branchName))];

        return {
            branches: summarizeRecurringDamageBranches(branchNames, recurringStores),
            stores: recurringStores,
        };
    } catch (error) {
        logger.error(
            {
                operation: "loadRecurringDamage",
                filters: JSON.stringify(filters),
            },
            "Failed to load recurring damage",
            error,
        );
        throw error;
    }
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: tanpa error.

- [ ] **Step 4: Write the temporary verification script**

Create `scripts/tmp-check-recurring-damage.ts` (jangan di-commit):

```ts
import prisma from "../lib/prisma";
import { fetchDamageDetections } from "../app/dashboard/recurring-damage/detections-query";
import {
    buildRecurringDamageStores,
    getRecurringDamageWindow,
    summarizeRecurringDamageBranches,
} from "../lib/recurring-damage";

async function run() {
    const stores = await prisma.store.findMany({
        where: { isActive: true, branchName: { not: "HEAD OFFICE" } },
        select: { code: true, name: true, branchName: true },
    });
    const year = Number(process.argv[2] ?? new Date().getFullYear());
    const { start, endExclusive } = getRecurringDamageWindow({ year });

    const startedAt = performance.now();
    const detections = await fetchDamageDetections({ stores, start, endExclusive });
    const durationMs = Math.round(performance.now() - startedAt);

    const recurring = buildRecurringDamageStores(detections);
    const branches = summarizeRecurringDamageBranches(
        [...new Set(stores.map((store) => store.branchName))],
        recurring,
    );

    console.log({
        year,
        activeStores: stores.length,
        detections: detections.length,
        problematicStores: recurring.length,
        durationMs,
    });
    console.log("Top branches:", branches.slice(0, 5));
    console.log(
        "Top stores:",
        recurring.slice(0, 3).map((store) => ({
            storeCode: store.storeCode,
            maxFrequency: store.maxFrequency,
            topItemId: store.topItemId,
            recurringItemCount: store.recurringItemCount,
        })),
    );

    const [signage] = await prisma.$queryRaw<{ mismatched: number }[]>`
        SELECT count(*)::int AS "mismatched"
        FROM "Report" r
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(r."items") = 'array' THEN r."items"
                ELSE '[]'::jsonb
            END
        ) AS item
        WHERE item->>'signageCondition' IN ('PUDAR', 'RUSAK')
          AND item->>'preventiveCondition' IS DISTINCT FROM 'NOT_OK'
    `;
    console.log("Signage Pudar/Rusak bukan NOT_OK:", signage.mismatched);
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
```

- [ ] **Step 5: Run the verification against the local database**

Run: `npx tsx scripts/tmp-check-recurring-damage.ts 2026`
Expected:
- tanpa error;
- `Signage Pudar/Rusak bukan NOT_OK: 0` (bila tidak 0, hentikan dan laporkan ke user: aturan deteksi signage perlu ditinjau);
- `durationMs` di bawah 2000. Bila lebih, jalankan `EXPLAIN ANALYZE` untuk query yang sama (salin SQL dari `detections-query.ts` dengan nilai literal) di `npm run db:studio`/psql lokal, lalu catat temuan di task note bagian Remaining Work and Risks.
- Bandingkan satu toko teratas secara manual: buka `/dashboard/reports?search=<kode toko>` atau Prisma Studio dan pastikan item teratasnya memang rusak di ≥ 2 laporan dengan status yang dihitung.

Setelah selesai, hapus script:

```bash
rm scripts/tmp-check-recurring-damage.ts
```

- [ ] **Step 6: Update the task note**

Di `## Changed Files` tambahkan:

```markdown
- `app/dashboard/recurring-damage/detections-query.ts`: query JSONB item rusak per toko/periode (tanpa cek akses).
- `app/dashboard/recurring-damage/queries.ts`: `loadRecurringDamage` dengan cek role dan cakupan cabang.
```

Di `## Verification` tambahkan ringkasan hasil Step 5 tanpa data toko/laporan, contoh: `- Script verifikasi sementara di DB lokal (2026): N toko aktif, durasi X ms, signage Pudar/Rusak di luar NOT_OK = 0. Script dihapus.`

- [ ] **Step 7: Commit**

```bash
git status --short scripts
git add app/dashboard/recurring-damage/detections-query.ts app/dashboard/recurring-damage/queries.ts docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "feat(recurring-damage): load scoped damage detections"
```

`git status --short scripts` harus kosong (script sementara sudah dihapus).

---

### Task 5: Halaman, drill-down, dan menu sidebar

**Files:**
- Create: `app/dashboard/recurring-damage/_components/recurring-damage-filters.tsx`
- Create: `app/dashboard/recurring-damage/_components/recurring-branch-table.tsx`
- Create: `app/dashboard/recurring-damage/_components/recurring-store-table.tsx`
- Create: `app/dashboard/recurring-damage/_components/recurring-store-sheet.tsx`
- Create: `app/dashboard/recurring-damage/_components/recurring-damage-view.tsx`
- Create: `app/dashboard/recurring-damage/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Consumes: `loadRecurringDamage` (Task 4); tipe dan helper periode (Task 1–2); `MetricColumn`, `EmptyTable`, `ReportStatusBadge` (Task 3); `getPreventiveBranchOptions(): Promise<string[]>` dan `getReportYears(): Promise<number[]>` dari `app/dashboard/preventive/actions.ts`; `describeSignageCondition({ signageCondition, signageMaterial }): { text: string } | null` dari `lib/signage.ts`; `STORE_BRAND_OPTIONS`, `normalizeStoreBrandFilter`, `StoreBrandFilter` dari `lib/store-brand-filter.ts`; `AdminDashboardShell`.
- Produces:
  - `type RecurringDamageFilterChange = { year?: number; quarter?: number; month?: number; branch?: string; brand?: StoreBrandFilter }`
  - `RecurringDamageView` props: `{ isAdmin: boolean; branchOptions: string[]; availableYears: number[]; period: RecurringDamagePeriod; branchName: string; brand: StoreBrandFilter; branches: RecurringDamageBranchSummary[]; stores: RecurringDamageStore[]; showBranchList: boolean; loadError: boolean; initialStoreCode: string | null }`
  - Route `/dashboard/recurring-damage` dengan query `year`, `quarter`, `month`, `branch`, `brand`, `store`.

- [ ] **Step 1: Create the filter bar**

Create `app/dashboard/recurring-damage/_components/recurring-damage-filters.tsx`:

```tsx
"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RECURRING_DAMAGE_MONTH_LABELS,
    RECURRING_DAMAGE_QUARTER_MONTHS,
    type RecurringDamagePeriod,
} from "@/lib/recurring-damage";
import { STORE_BRAND_OPTIONS, type StoreBrandFilter } from "@/lib/store-brand-filter";

const ALL = "all";

const quarterOptions = [
    { value: 1, label: "Triwulan 1" },
    { value: 2, label: "Triwulan 2" },
    { value: 3, label: "Triwulan 3" },
    { value: 4, label: "Triwulan 4" },
] as const;

export type RecurringDamageFilterChange = {
    year?: number;
    quarter?: number;
    month?: number;
    branch?: string;
    brand?: StoreBrandFilter;
};

export function RecurringDamageFilters({
    isAdmin,
    branchOptions,
    availableYears,
    period,
    branchName,
    brand,
    onChange,
}: {
    isAdmin: boolean;
    branchOptions: string[];
    availableYears: number[];
    period: RecurringDamagePeriod;
    branchName: string;
    brand: StoreBrandFilter;
    onChange: (change: RecurringDamageFilterChange) => void;
}) {
    const monthOptions = period.quarter
        ? RECURRING_DAMAGE_QUARTER_MONTHS[period.quarter]
        : [];
    const yearOptions = availableYears.includes(period.year)
        ? availableYears
        : [period.year, ...availableYears];

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            {isAdmin ? (
                <Select
                    value={brand}
                    onValueChange={(value) =>
                        onChange({ brand: value as StoreBrandFilter })
                    }
                >
                    <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[140px]">
                        <SelectValue placeholder="Semua Brand" />
                    </SelectTrigger>
                    <SelectContent>
                        {STORE_BRAND_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
            {isAdmin ? (
                <Select
                    value={branchName}
                    onValueChange={(value) => onChange({ branch: value })}
                >
                    <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[190px]">
                        <SelectValue placeholder="Semua Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Semua Cabang</SelectItem>
                        {branchOptions.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                                {branch}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
            <Select
                value={period.quarter?.toString() ?? ALL}
                onValueChange={(value) =>
                    onChange({
                        quarter: value === ALL ? undefined : Number(value),
                        month: undefined,
                    })
                }
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[150px]">
                    <SelectValue placeholder="Triwulan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Semua Triwulan</SelectItem>
                    {quarterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={period.month?.toString() ?? ALL}
                disabled={!period.quarter}
                onValueChange={(value) =>
                    onChange({ month: value === ALL ? undefined : Number(value) })
                }
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[140px]">
                    <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Semua Bulan</SelectItem>
                    {monthOptions.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                            {RECURRING_DAMAGE_MONTH_LABELS[month - 1]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={period.year.toString()}
                onValueChange={(value) => onChange({ year: Number(value) })}
            >
                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[110px]">
                    <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                    {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
```

- [ ] **Step 2: Create the branch table (Layer 1)**

Create `app/dashboard/recurring-damage/_components/recurring-branch-table.tsx`:

```tsx
"use client";

import { ChevronRight, Store } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { RecurringDamageBranchSummary } from "@/lib/recurring-damage";
import { cn } from "@/lib/utils";

export function RecurringBranchTable({
    branches,
    onSelectBranch,
}: {
    branches: RecurringDamageBranchSummary[];
    onSelectBranch: (branchName: string) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-background">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[180px] text-[11px]">Cabang</TableHead>
                        <TableHead className="min-w-[140px] text-[11px]">
                            Toko problematik
                        </TableHead>
                        <TableHead className="w-[48px] text-[11px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {branches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3}>
                                <EmptyTable
                                    icon={Store}
                                    title="Tidak ada cabang"
                                    description="Filter belum menghasilkan data cabang."
                                />
                            </TableCell>
                        </TableRow>
                    ) : (
                        branches.map((branch) => (
                            <TableRow
                                key={branch.branchName}
                                className="cursor-pointer"
                                onClick={() => onSelectBranch(branch.branchName)}
                            >
                                <TableCell className="text-xs font-medium">
                                    {branch.branchName}
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "text-xs",
                                        branch.problematicStoreCount > 0
                                            ? "font-medium text-red-700"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {branch.problematicStoreCount}
                                </TableCell>
                                <TableCell>
                                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 3: Create the store table (Layer 2)**

Create `app/dashboard/recurring-damage/_components/recurring-store-table.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Repeat, Search } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { RecurringDamageStore } from "@/lib/recurring-damage";

export function RecurringStoreTable({
    stores,
    onSelectStore,
}: {
    stores: RecurringDamageStore[];
    onSelectStore: (storeCode: string) => void;
}) {
    const [search, setSearch] = useState("");

    const filteredStores = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return stores;
        return stores.filter(
            (store) =>
                store.storeCode.toLowerCase().includes(query) ||
                store.storeName.toLowerCase().includes(query),
        );
    }, [stores, search]);

    return (
        <div className="flex flex-col gap-3">
            <div className="relative w-full lg:w-[280px]">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari kode / nama toko"
                    className="h-8 bg-background pl-8 text-xs"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>
            <div className="overflow-hidden rounded-lg border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[54px] text-[11px]">No</TableHead>
                            <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                            <TableHead className="min-w-[240px] text-[11px]">
                                Item tersering
                            </TableHead>
                            <TableHead className="min-w-[120px] text-[11px]">
                                Frekuensi maks
                            </TableHead>
                            <TableHead className="min-w-[120px] text-[11px]">
                                Item berulang
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStores.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <EmptyTable
                                        icon={Repeat}
                                        title={
                                            stores.length === 0
                                                ? "Tidak ada toko problematik"
                                                : "Toko tidak ditemukan"
                                        }
                                        description={
                                            stores.length === 0
                                                ? "Tidak ada toko dengan item rusak berulang di periode ini."
                                                : "Tidak ada toko yang cocok dengan pencarian."
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStores.map((store, index) => (
                                <TableRow
                                    key={store.storeCode}
                                    className="cursor-pointer"
                                    onClick={() => onSelectStore(store.storeCode)}
                                >
                                    <TableCell className="text-xs text-muted-foreground">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <div className="font-medium">{store.storeName}</div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {store.storeCode}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-medium">{store.topItemId}</span>
                                        <span className="text-muted-foreground">
                                            {" "}
                                            · {store.topItemName}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                                            {store.maxFrequency}x
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {store.recurringItemCount}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Create the store sheet (Layer 3–4)**

Create `app/dashboard/recurring-damage/_components/recurring-store-sheet.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink, Repeat } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { ReportStatusBadge } from "@/components/dashboard/report-status-badge";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    formatRecurringDamagePeriod,
    type RecurringDamageItem,
    type RecurringDamagePeriod,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import { describeSignageCondition } from "@/lib/signage";
import { formatJakartaDate } from "@/lib/time";

const HANDLER_LABELS: Record<string, string> = {
    BMS: "BMS",
    REKANAN: "Rekanan",
};

function RecurringItemSection({
    item,
    defaultOpen,
}: {
    item: RecurringDamageItem;
    defaultOpen: boolean;
}) {
    return (
        <Collapsible defaultOpen={defaultOpen} className="rounded-lg border bg-background">
            <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2 text-left">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                        {item.itemId} · {item.itemName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                        {item.categoryName}
                    </p>
                </div>
                <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                    {item.count}x
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <ul className="divide-y border-t">
                    {item.detections.map((detection) => {
                        const signage = describeSignageCondition(detection);
                        return (
                            <li
                                key={detection.reportNumber}
                                className="flex flex-col gap-1 px-3 py-2 text-xs"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={`/dashboard/reports/${detection.reportNumber}`}
                                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                    >
                                        {detection.reportNumber}
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <span className="text-muted-foreground">
                                        {formatJakartaDate(detection.createdAt)}
                                    </span>
                                    <ReportStatusBadge status={detection.status} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    <span>
                                        Handler:{" "}
                                        {detection.handler
                                            ? (HANDLER_LABELS[detection.handler] ??
                                              detection.handler)
                                            : "-"}
                                    </span>
                                    {signage ? <span>Kondisi: {signage.text}</span> : null}
                                </div>
                                {detection.notes ? (
                                    <p className="text-[11px] text-muted-foreground">
                                        {detection.notes}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function RecurringStoreSheet({
    open,
    store,
    period,
    onOpenChange,
}: {
    open: boolean;
    store: RecurringDamageStore | null;
    period: RecurringDamagePeriod;
    onOpenChange: (open: boolean) => void;
}) {
    const periodLabel = formatRecurringDamagePeriod(period);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>{store ? store.storeName : "Detail toko"}</SheetTitle>
                    <SheetDescription>
                        {store
                            ? `${store.storeCode} · ${store.branchName} · ${periodLabel}`
                            : periodLabel}
                    </SheetDescription>
                </SheetHeader>
                <div className="no-scrollbar grid gap-3 overflow-y-auto px-4 pb-4">
                    {store ? (
                        store.items.map((item, index) => (
                            <RecurringItemSection
                                key={item.itemId}
                                item={item}
                                defaultOpen={index === 0}
                            />
                        ))
                    ) : (
                        <EmptyTable
                            icon={Repeat}
                            title="Tidak ada data toko"
                            description="Toko ini tidak punya item rusak berulang di periode ini atau berada di luar cakupan Anda."
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
```

- [ ] **Step 5: Create the page view**

Create `app/dashboard/recurring-damage/_components/recurring-damage-view.tsx`:

```tsx
"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { MetricColumn } from "@/components/dashboard/metric-column";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    formatRecurringDamagePeriod,
    type RecurringDamageBranchSummary,
    type RecurringDamagePeriod,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";
import { cn } from "@/lib/utils";
import {
    RecurringDamageFilters,
    type RecurringDamageFilterChange,
} from "./recurring-damage-filters";
import { RecurringBranchTable } from "./recurring-branch-table";
import { RecurringStoreSheet } from "./recurring-store-sheet";
import { RecurringStoreTable } from "./recurring-store-table";

const PAGE_PATH = "/dashboard/recurring-damage";

export function RecurringDamageView({
    isAdmin,
    branchOptions,
    availableYears,
    period,
    branchName,
    brand,
    branches,
    stores,
    showBranchList,
    loadError,
    initialStoreCode,
}: {
    isAdmin: boolean;
    branchOptions: string[];
    availableYears: number[];
    period: RecurringDamagePeriod;
    branchName: string;
    brand: StoreBrandFilter;
    branches: RecurringDamageBranchSummary[];
    stores: RecurringDamageStore[];
    showBranchList: boolean;
    loadError: boolean;
    initialStoreCode: string | null;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(
        initialStoreCode,
    );

    // Filter berubah → render ulang di server dengan query baru.
    const navigate = useCallback(
        (change: RecurringDamageFilterChange) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(change)) {
                if (value === undefined || value === "all" || value === "ALL") {
                    params.delete(key);
                } else {
                    params.set(key, String(value));
                }
            }
            params.delete("store");
            setSelectedStoreCode(null);

            const query = params.toString();
            startTransition(() => {
                router.replace(query ? `${PAGE_PATH}?${query}` : PAGE_PATH, {
                    scroll: false,
                });
            });
        },
        [router, searchParams],
    );

    // Data toko sudah ada di klien; panel cukup memperbarui URL tanpa render ulang.
    const selectStore = useCallback((storeCode: string | null) => {
        setSelectedStoreCode(storeCode);
        const params = new URLSearchParams(window.location.search);
        if (storeCode) {
            params.set("store", storeCode);
        } else {
            params.delete("store");
        }
        const query = params.toString();
        window.history.replaceState(null, "", query ? `${PAGE_PATH}?${query}` : PAGE_PATH);
    }, []);

    const selectedStore = useMemo(
        () => stores.find((store) => store.storeCode === selectedStoreCode) ?? null,
        [stores, selectedStoreCode],
    );

    const problematicCount = showBranchList
        ? branches.reduce((total, branch) => total + branch.problematicStoreCount, 0)
        : stores.length;

    return (
        <div className="flex min-h-full flex-col bg-muted/30">
            <div className="border-b bg-background px-4 py-3 lg:px-6">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    {formatRecurringDamagePeriod(period)}
                                </Badge>
                                {!showBranchList && branchName ? (
                                    <Badge variant="outline">{branchName}</Badge>
                                ) : null}
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Toko dengan item checklist yang sama rusak lebih dari
                                1x pada periode terpilih.
                            </p>
                        </div>
                        <RecurringDamageFilters
                            isAdmin={isAdmin}
                            branchOptions={branchOptions}
                            availableYears={availableYears}
                            period={period}
                            branchName={branchName}
                            brand={brand}
                            onChange={navigate}
                        />
                    </div>

                    <div className="overflow-hidden rounded-lg border bg-background">
                        <div className="grid">
                            <MetricColumn
                                label="Toko problematik"
                                value={loadError ? "-" : problematicCount.toString()}
                                tone={
                                    loadError
                                        ? "default"
                                        : problematicCount > 0
                                          ? "bad"
                                          : "good"
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    "p-4 lg:p-6",
                    isPending && "pointer-events-none opacity-60",
                )}
            >
                {loadError ? (
                    <div className="overflow-hidden rounded-lg border bg-background">
                        <EmptyTable
                            icon={AlertCircle}
                            title="Gagal memuat data"
                            description="Data kerusakan berulang tidak dapat dimuat. Silakan coba lagi."
                        />
                    </div>
                ) : showBranchList ? (
                    <RecurringBranchTable
                        branches={branches}
                        onSelectBranch={(name) => navigate({ branch: name })}
                    />
                ) : (
                    <div className="flex flex-col gap-3">
                        {isAdmin ? (
                            <div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate({ branch: "all" })}
                                >
                                    <ChevronLeft data-icon="inline-start" />
                                    Semua cabang
                                </Button>
                            </div>
                        ) : null}
                        <RecurringStoreTable stores={stores} onSelectStore={selectStore} />
                    </div>
                )}
            </div>

            <RecurringStoreSheet
                open={selectedStoreCode !== null}
                store={selectedStore}
                period={period}
                onOpenChange={(open) => {
                    if (!open) selectStore(null);
                }}
            />
        </div>
    );
}
```

- [ ] **Step 6: Create the page**

Create `app/dashboard/recurring-damage/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { normalizeRecurringDamagePeriod, type RecurringDamageData } from "@/lib/recurring-damage";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import { getJakartaYear } from "@/lib/time";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getPreventiveBranchOptions, getReportYears } from "../preventive/actions";
import { RecurringDamageView } from "./_components/recurring-damage-view";
import { loadRecurringDamage } from "./queries";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        year?: string;
        quarter?: string;
        month?: string;
        branch?: string;
        brand?: string;
        store?: string;
    }>;
};

export default async function RecurringDamagePage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const isAdmin = user.role === "ADMIN";
    const params = await searchParams;
    const period = normalizeRecurringDamagePeriod(params, getJakartaYear());
    const brand = isAdmin ? normalizeStoreBrandFilter(params.brand) : "ALL";
    const branchName = isAdmin
        ? params.branch?.trim() || "all"
        : (user.branchNames[0] ?? "");
    const showBranchList = isAdmin && branchName === "all";

    const [branchOptions, availableYears] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve<string[]>([]),
        getReportYears(),
    ]);

    let data: RecurringDamageData | null = null;
    try {
        data = await loadRecurringDamage({ ...period, branchName, brand });
    } catch {
        // Sudah dicatat oleh loadRecurringDamage; tampilkan pesan gagal memuat.
        data = null;
    }

    return (
        <AdminDashboardShell
            user={user}
            title="Kerusakan Berulang"
            breadcrumbs={[{ label: "Kerusakan Berulang" }]}
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <RecurringDamageView
                isAdmin={isAdmin}
                branchOptions={branchOptions}
                availableYears={availableYears}
                period={period}
                branchName={branchName}
                brand={brand}
                branches={data?.branches ?? []}
                stores={showBranchList ? [] : (data?.stores ?? [])}
                showBranchList={showBranchList}
                loadError={data === null}
                initialStoreCode={params.store?.trim() || null}
            />
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 7: Add the sidebar menu**

Di `components/app-sidebar.tsx`:

1. Tambahkan `IconRepeat,` ke import dari `@tabler/icons-react` (blok pertama, setelah `IconUserCog,`).
2. Di grup `Monitoring`, setelah objek `Performa BMS`, tambahkan:

```tsx
                {
                    title: "Kerusakan Berulang",
                    url: "/dashboard/recurring-damage",
                    icon: IconRepeat,
                },
```

3. Di `shouldShowItem`, ubah array `baseItems` untuk BMC/BNM menjadi:

```tsx
            const baseItems = [
                "Laporan Maintenance",
                "Checklist Preventif",
                "Dokumen PJUM",
                "Performa BMS",
                "Kerusakan Berulang",
            ];
```

Admin sudah melihat semua menu kecuali "Performa BMS", jadi tidak perlu perubahan lain.

- [ ] **Step 8: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: tanpa error.

Run: `npx eslint app/dashboard/recurring-damage components/app-sidebar.tsx`
Expected: 0 error, 0 warning.

- [ ] **Step 9: Verify in the browser**

Jalankan dev server lewat `preview_start` (buat `.claude/launch.json` bila belum ada: `runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3001`). Login dengan akun uji lokal yang sudah ada; bila tidak ada, tanya user sebelum membuat akun uji. Periksa:
- Admin: menu "Kerusakan Berulang" muncul di grup Monitoring; `/dashboard/recurring-damage` menampilkan tabel cabang dengan jumlah toko problematik; klik cabang → `?branch=` dan tabel toko muncul; tombol "Semua cabang" kembali ke tabel cabang.
- Filter Triwulan → Bulan aktif dan hanya berisi 3 bulan kuartal itu; ganti Triwulan mereset Bulan; badge periode berubah ("Tahun 2026", "Triwulan 2 2026", "Mei 2026").
- Klik toko → panel kanan terbuka, URL berisi `?store=`; item pertama terbuka; nomor laporan membuka `/dashboard/reports/<no>`; reload halaman dengan `?store=` membuka panel yang sama; `?store=` berisi kode toko yang tidak ada di tabel (misalnya toko cabang lain) menampilkan "Tidak ada data toko".
- BMC/BNM: tidak ada filter Brand/Cabang; langsung tabel toko cabangnya; `?branch=CABANG_LAIN` di URL tidak mengubah data.
- `read_console_messages` tanpa error; ambil screenshot tabel toko dan panel sebagai bukti.

Bila tidak ada akun uji yang bisa dipakai, catat di task note bahwa cek browser belum dilakukan.

- [ ] **Step 10: Update the task note**

Di `## Changed Files` tambahkan:

```markdown
- `app/dashboard/recurring-damage/page.tsx` dan `_components/*`: halaman Kerusakan Berulang (filter Tahun → Triwulan → Bulan, tabel cabang, tabel toko, panel toko).
- `components/app-sidebar.tsx`: menu "Kerusakan Berulang" di grup Monitoring untuk Admin, BMC, BNM.
```

Di `## Verification` tambahkan hasil Step 8–9.

- [ ] **Step 11: Commit**

```bash
git add app/dashboard/recurring-damage components/app-sidebar.tsx docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "feat(recurring-damage): add dashboard page and drill-down"
```

---

### Task 6: Export XLSX

**Files:**
- Create: `app/api/dashboard/recurring-damage/export/route.ts`
- Create: `app/dashboard/recurring-damage/_components/export-recurring-damage-button.tsx`
- Modify: `app/dashboard/recurring-damage/page.tsx`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

**Interfaces:**
- Consumes: `loadRecurringDamage` (Task 4); `isValidRecurringDamagePeriod`, `RecurringDamageFilters`, `RecurringDamageStore` (Task 1–2); `compareChecklistItemIds`; `getReportStatusLabel`; `describeSignageCondition`; `parseStoreBrandFilter(value: unknown): StoreBrandFilter | null`; `getJakartaYear`, `toExcelJakartaSerial`.
- Produces:
  - `POST /api/dashboard/recurring-damage/export` dengan body `{ year?: number; quarter?: number; month?: number; branchName?: string; brand?: string }`; respons XLSX (`Content-Disposition: attachment; filename="Kerusakan_Berulang_..."`), 400 untuk filter tidak valid, 401 untuk akses tidak sah, 500 untuk error lain.
  - `ExportRecurringDamageButton({ filters: RecurringDamageFilters })`.

- [ ] **Step 1: Create the export route**

Create `app/api/dashboard/recurring-damage/export/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { loadRecurringDamage } from "@/app/dashboard/recurring-damage/queries";
import { compareChecklistItemIds } from "@/lib/checklist-data";
import { logger } from "@/lib/logger";
import {
    isValidRecurringDamagePeriod,
    type RecurringDamageFilters,
    type RecurringDamageStore,
} from "@/lib/recurring-damage";
import { getReportStatusLabel } from "@/lib/report-status";
import { describeSignageCondition } from "@/lib/signage";
import { parseStoreBrandFilter } from "@/lib/store-brand-filter";
import { getJakartaYear, toExcelJakartaSerial } from "@/lib/time";

type RequestBody = {
    year?: number;
    quarter?: number;
    month?: number;
    branchName?: string;
    brand?: string;
};

const CONTENT_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DATE_FORMAT = "DD/MM/YYYY HH.mm";

const HANDLER_LABELS: Record<string, string> = {
    BMS: "BMS",
    REKANAN: "Rekanan",
};

function textCell(value: string | null | undefined): XLSX.CellObject {
    return { t: "s", v: value ?? "" };
}

function numCell(value: number): XLSX.CellObject {
    return { t: "n", v: value };
}

function dateCell(value: string): XLSX.CellObject {
    const serial = toExcelJakartaSerial(value);
    if (serial === null) return { t: "s", v: "" };
    return { t: "n", v: serial, z: DATE_FORMAT };
}

function buildSheet(
    data: XLSX.CellObject[][],
    colCount: number,
): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {};

    data.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
            const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            ws[addr] = cell;
        });
    });

    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(data.length - 1, 0), c: colCount - 1 },
    });
    ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
        const maxLen = data.reduce((max, row) => {
            const cell = row[i];
            const len = cell?.v !== undefined ? String(cell.v).length : 0;
            return Math.max(max, len);
        }, 10);
        return { wch: Math.min(maxLen + 2, 42) };
    });

    return ws;
}

function buildStoreSummarySheet(stores: RecurringDamageStore[]): XLSX.WorkSheet {
    const headers = [
        "No",
        "Cabang",
        "Kode Toko",
        "Nama Toko",
        "Frekuensi Maks",
        "Item Tersering",
        "Jumlah Item Berulang",
    ];
    const rows = stores.map((store, index) => [
        numCell(index + 1),
        textCell(store.branchName),
        textCell(store.storeCode),
        textCell(store.storeName),
        numCell(store.maxFrequency),
        textCell(`${store.topItemId} - ${store.topItemName}`),
        numCell(store.recurringItemCount),
    ]);

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function buildDetectionSheet(stores: RecurringDamageStore[]): XLSX.WorkSheet {
    const headers = [
        "No",
        "Cabang",
        "Kode Toko",
        "Nama Toko",
        "ID Item",
        "Nama Item",
        "Kategori",
        "No. Laporan",
        "Tanggal Laporan",
        "Status",
        "Handler",
        "Kondisi Signage",
        "Catatan",
    ];

    // Sort stabil: urut cabang, urutan ranking toko tetap di dalam cabang.
    const orderedStores = [...stores].sort((a, b) =>
        a.branchName.localeCompare(b.branchName),
    );
    const rows: XLSX.CellObject[][] = [];

    for (const store of orderedStores) {
        const items = [...store.items].sort((a, b) =>
            compareChecklistItemIds(a.itemId, b.itemId),
        );
        for (const item of items) {
            for (const detection of item.detections) {
                rows.push([
                    numCell(rows.length + 1),
                    textCell(store.branchName),
                    textCell(store.storeCode),
                    textCell(store.storeName),
                    textCell(item.itemId),
                    textCell(item.itemName),
                    textCell(item.categoryName),
                    textCell(detection.reportNumber),
                    dateCell(detection.createdAt),
                    textCell(getReportStatusLabel(detection.status)),
                    textCell(
                        detection.handler
                            ? (HANDLER_LABELS[detection.handler] ?? detection.handler)
                            : "",
                    ),
                    textCell(describeSignageCondition(detection)?.text),
                    textCell(detection.notes),
                ]);
            }
        }
    }

    return buildSheet([headers.map(textCell), ...rows], headers.length);
}

function sanitizeFileSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function parseFilters(body: RequestBody): RecurringDamageFilters | null {
    const period = {
        year: body.year ?? getJakartaYear(),
        quarter: body.quarter,
        month: body.month,
    };
    if (!isValidRecurringDamagePeriod(period)) return null;

    const brand = parseStoreBrandFilter(body.brand);
    if (brand === null) return null;
    if (
        body.branchName !== undefined &&
        (typeof body.branchName !== "string" || body.branchName.trim() === "")
    ) {
        return null;
    }

    return { ...period, branchName: body.branchName, brand };
}

export async function POST(request: NextRequest) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    let body: RequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    const filters = parseFilters(body);
    if (!filters) {
        return NextResponse.json(
            { error: "Filter export tidak valid" },
            { status: 400 },
        );
    }

    try {
        const data = await loadRecurringDamage(filters);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
            wb,
            buildStoreSummarySheet(data.stores),
            "Ringkasan Toko",
        );
        XLSX.utils.book_append_sheet(
            wb,
            buildDetectionSheet(data.stores),
            "Detail Deteksi",
        );

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        // BMC/BNM selalu satu cabang; pakai nama dari data, bukan dari body.
        const branchSegment = sanitizeFileSegment(
            data.branches.length === 1 &&
                (filters.branchName ?? "all") !== "all"
                ? data.branches[0].branchName
                : "Semua_Cabang",
        );
        const quarterSegment = filters.quarter ? `_TW${filters.quarter}` : "";
        const monthSegment = filters.month
            ? `_${String(filters.month).padStart(2, "0")}`
            : "";
        const fileName = `Kerusakan_Berulang_${branchSegment}_${filters.year}${quarterSegment}${monthSegment}.xlsx`;

        logger.info(
            {
                operation: "recurringDamageExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                stores: data.stores.length,
            },
            "Recurring damage export completed",
        );

        return new NextResponse(buf, {
            headers: {
                "Content-Type": CONTENT_TYPE,
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const status = message === "Unauthorized" ? 401 : 500;

        logger.error(
            {
                operation: "recurringDamageExportXlsx",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Recurring damage export failed",
            error,
        );

        return NextResponse.json(
            {
                error:
                    status === 500
                        ? "Gagal mengekspor kerusakan berulang. Silakan coba lagi."
                        : "Anda tidak punya akses untuk ekspor ini",
            },
            { status },
        );
    }
}
```

- [ ] **Step 2: Create the export button**

Create `app/dashboard/recurring-damage/_components/export-recurring-damage-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RecurringDamageFilters } from "@/lib/recurring-damage";

function getFileNameFromDisposition(disposition: string | null) {
    if (!disposition) return null;

    const match = /filename="([^"]+)"/.exec(disposition);
    return match?.[1] ?? null;
}

export function ExportRecurringDamageButton({
    filters,
}: {
    filters: RecurringDamageFilters;
}) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const toastId = toast.loading("Menyiapkan file kerusakan berulang...");

        try {
            const res = await fetch("/api/dashboard/recurring-damage/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Gagal mengekspor kerusakan berulang");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                getFileNameFromDisposition(res.headers.get("Content-Disposition")) ??
                "Kerusakan_Berulang.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File kerusakan berulang berhasil diunduh", { id: toastId });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Gagal mengekspor kerusakan berulang";
            toast.error(message, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
                <Download data-icon="inline-start" />
            )}
            Ekspor XLSX
        </Button>
    );
}
```

- [ ] **Step 3: Put the button in the page header**

Di `app/dashboard/recurring-damage/page.tsx`:

1. Tambahkan import setelah import `RecurringDamageView`:

```tsx
import { ExportRecurringDamageButton } from "./_components/export-recurring-damage-button";
```

2. Tambahkan prop berikut ke `<AdminDashboardShell ...>` (setelah `breadcrumbs`):

```tsx
            headerActions={
                <ExportRecurringDamageButton
                    filters={{ ...period, branchName, brand }}
                />
            }
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: tanpa error.

Run: `npx eslint app/dashboard/recurring-damage app/api/dashboard/recurring-damage`
Expected: 0 error, 0 warning.

- [ ] **Step 5: Verify the export in the browser**

Dengan dev server dan akun uji dari Task 5:
- Admin "Semua Cabang" Tahun berjalan: klik `Ekspor XLSX` → file `Kerusakan_Berulang_Semua_Cabang_<tahun>.xlsx` terunduh, toast sukses.
- Admin cabang tertentu, Triwulan 2, Bulan Mei → nama file `Kerusakan_Berulang_<CABANG>_<tahun>_TW2_05.xlsx`.
- Buka file (atau baca dengan `npx tsx -e "const X=require('xlsx');const wb=X.readFile('<path>');console.log(wb.SheetNames, X.utils.sheet_to_json(wb.Sheets['Ringkasan Toko']).length)"`): sheet `Ringkasan Toko` dan `Detail Deteksi` ada; jumlah baris Ringkasan Toko = jumlah toko problematik di halaman; jumlah baris Detail Deteksi = total deteksi di item berulang.
- BMC: file hanya berisi cabangnya.
- `read_network_requests` untuk `/api/dashboard/recurring-damage/export` menunjukkan status 200.

Bila tidak ada akun uji, catat di task note bahwa cek export di browser belum dilakukan.

- [ ] **Step 6: Update the task note**

Di `## Changed Files` tambahkan:

```markdown
- `app/api/dashboard/recurring-damage/export/route.ts`: export XLSX (sheet Ringkasan Toko dan Detail Deteksi), akses sama dengan halaman.
- `app/dashboard/recurring-damage/_components/export-recurring-damage-button.tsx`, `page.tsx`: tombol Ekspor XLSX di header.
```

Di `## Verification` tambahkan hasil Step 4–5.

- [ ] **Step 7: Commit**

```bash
git add app/api/dashboard/recurring-damage app/dashboard/recurring-damage docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "feat(recurring-damage): add xlsx export"
```

---

### Task 7: Dokumentasi dan verifikasi akhir

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/agent-notes/<STAMP>-recurring-damage.md`

- [ ] **Step 1: Update CLAUDE.md**

Di `CLAUDE.md` bagian `## Notes`, tambahkan bullet di akhir daftar:

```markdown
- `/dashboard/recurring-damage` (Kerusakan Berulang, Admin/BMC/BNM) lists active stores where the same checklist item was damaged (`RUSAK` or `NOT_OK`, signage Pudar included) in ≥ 2 reports within the Tahun → Triwulan → Bulan filter (`Report.createdAt` WIB), excluding `DRAFT`, `ARCHIVED_PREVENTIVE`, `ESTIMATION_REJECTED`; branch comes from `Store.branchName`. Rules live in `lib/recurring-damage.ts`; export at `POST /api/dashboard/recurring-damage/export`
```

- [ ] **Step 2: Run the full checks**

Run: `npx tsx lib/recurring-damage.spec.ts`
Expected: tanpa output, exit 0.

Run: `npx tsx lib/report-preventive.spec.ts`
Expected: tanpa output, exit 0 (memastikan modul preventif tidak terpengaruh).

Run: `npx tsc --noEmit`
Expected: tanpa error.

Run: `npx eslint lib/recurring-damage.ts lib/recurring-damage.spec.ts components/dashboard components/app-sidebar.tsx app/dashboard/recurring-damage app/api/dashboard/recurring-damage app/dashboard/preventive/_components/admin-preventive-table.tsx`
Expected: 0 error. Warning lama di `admin-preventive-table.tsx` (bila ada) boleh tetap; tidak ada warning baru. `npm run lint` untuk seluruh repo boleh masih menampilkan error lama di file lain.

Run: `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
Expected: build sukses; route `/dashboard/recurring-damage` dan `/api/dashboard/recurring-damage/export` muncul di output.

- [ ] **Step 3: Finalize the task note**

Di `docs/agent-notes/<STAMP>-recurring-damage.md`:
- `## Changed Files`: tambahkan `` - `CLAUDE.md`: catatan perilaku halaman Kerusakan Berulang. ``
- `## Verification`: tambahkan hasil Step 2 (spec, tsc, lint, build).
- `## Remaining Work and Risks`: ganti isinya dengan daftar yang benar saat ini, minimal:
  - `- Akses BMS dan Branch Admin, metrik "rusak lagi setelah diperbaiki", dan persentase di Layer 1 sengaja di luar cakupan.`
  - Cek browser/export yang belum dilakukan (bila ada) beserta alasannya.
  - Temuan performa dari Task 4 (bila durasi > 2 detik).
  Tulis `None` hanya bila memang tidak ada.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/agent-notes/<STAMP>-recurring-damage.md
git commit -m "docs: document recurring damage page"
```

---

## Spec Coverage

| Spec | Task |
|---|---|
| Definisi deteksi rusak, status, item berulang, toko problematik | 1, 2 |
| Atribusi cabang `Store.branchName`, toko aktif | 4 |
| Periode Tahun → Triwulan → Bulan, WIB | 1, 5 |
| Ukuran per toko dan urutan | 2 |
| Akses Admin/BMC/BNM, `branch` diabaikan untuk BMC/BNM | 4, 5, 6 |
| Layer 1 tabel cabang (urut jumlah turun) / ringkasan | 2, 5 |
| Layer 2 tabel toko + pencarian | 5 |
| Layer 3–4 panel `Sheet`, `?store=`, tautan laporan, kondisi signage | 5 |
| Tampilan kosong dan gagal memuat | 5 |
| Export XLSX 2 sheet, nama file, akses | 6 |
| Komponen bersama dengan halaman Preventif | 3 |
| Pengujian spec + script verifikasi DB + cek browser | 1, 2, 4, 5, 6, 7 |
