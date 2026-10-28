# Ekspor XLSX Kondisi Signage (I11–I13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dialog "Ekspor XLSX" di halaman Laporan Maintenance bisa mengekspor data khusus item signage I11–I13, satu baris per item.

**Architecture:** Fungsi murni `toSignageExportRows` (di `lib/signage-export.ts`) mengubah satu laporan menjadi baris-baris item signage. Query `fetchSignageExportRows` memakai ulang `buildReportWhere` lalu menyaring laporan yang `items`-nya memuat I11/I12/I13. Route `/api/admin/export` mendapat sheet baru `"signage"` ("Rekap Signage"), yang juga dibuka untuk BMC/BNM lewat `resolveLimitedExportScope`. Dialog mendapat Select "Jenis Data" (Rekap Laporan / Kondisi Signage).

**Tech Stack:** Next.js 16 App Router (route handler), Prisma 7 (filter JSON `array_contains` di PostgreSQL), SheetJS `xlsx`, shadcn/ui Select, spec `node:assert/strict` dijalankan dengan `npx tsx`.

## Global Constraints

- Satu baris per item signage (I11, I12, I13) per laporan.
- Kolom berurutan persis: `No. Laporan`, `Tanggal Laporan`, `Kuartal`, `Branch`, `Brand`, `Kode Toko`, `Nama Toko`, `NIK BMS`, `Nama BMS`, `Status Laporan`, `Kode Item`, `Nama Item`, `Material`, `Kondisi`, `Catatan`, `No. Tiket AHO`.
- TIDAK ADA kolom `Handler` dan TIDAK ADA kolom `Tindak Lanjut`.
- `Tanggal Laporan` = `Report.createdAt`. Ini sama dengan acuan filter tanggal ekspor dan acuan masa jeda signage (`getLastSignageDate`).
- `Kuartal` = kuartal WIB dari `createdAt`, format `YYYY-QN` (mis. `2026-Q4`).
- `Kode Item` = itemId mentah (`I11`), sama dengan yang tampil di PDF. `Nama Item` = nama katalog (`Kondisi Fisik Shop Sign`, dst.).
- `Kondisi` = `Baik` / `Kotor` / `Pudar` / `Rusak` / `Tidak Ada`. `Material` = material tersimpan, atau `-` kalau Tidak Ada atau kosong.
- Hanya item dengan `preventiveCondition` OK / NOT_OK / TIDAK_ADA yang diekspor. Laporan berstatus DRAFT/arsip tetap dikecualikan oleh `buildReportWhere`.
- Untuk Jenis Data signage, filter Status PJUM dinonaktifkan di dialog dan diabaikan di server.
- Nama file unduhan signage: `Rekap_Signage_yyyyMMdd.xlsx`. Nama sheet: `Rekap Signage`.
- BMC dan BNM_MANAGER boleh mengekspor sheet `"signage"` dengan aturan cabang yang sama seperti sheet `"reports"`.
- Halaman `/admin/export` (`app/admin/export/_components/export-form.tsx`) TIDAK diubah. Default `sheets` di route juga TIDAK ditambah `"signage"`.
- Indentasi mengikuti file masing-masing: `route.ts` 2 spasi; `queries.ts`, `access.ts`, file `lib/`, dan `export-reports-dialog.tsx` 4 spasi.
- Jangan menambah padding/margin/gap manual pada komponen shadcn.
- Repo pre-commit hook mewajibkan task note: salin `docs/agent-notes/TEMPLATE.md` ke `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (waktu Asia/Jakarta), isi ringkas, lalu sertakan di commit. Jangan `--no-verify`.
- Jangan pernah menjalankan `git stash`, `git reset`, `git checkout -- <file>`.
- Commit memakai Conventional Commits, TANPA baris `Co-Authored-By` / "Generated with".
- `npx tsc --noEmit`: abaikan error yang hanya ada di `.next/`.

---

## File Structure

| File | Aksi | Tanggung jawab |
|---|---|---|
| `lib/signage-export.ts` | Create | Tipe baris ekspor, `formatJakartaQuarterLabel`, `toSignageExportRows` (murni, tanpa DB) |
| `lib/signage-export.spec.ts` | Create | Spec untuk konversi laporan → baris signage |
| `app/admin/export/queries.ts` | Modify | `fetchSignageExportRows(filter)` |
| `app/api/admin/export/access.ts` | Modify | `ExportSheet` + izin `"signage"` untuk BMC/BNM |
| `app/api/admin/export/access.spec.ts` | Modify | Assertion untuk sheet `"signage"` |
| `app/api/admin/export/route.ts` | Modify | `buildSignageSheet` + wiring sheet `"signage"` |
| `app/dashboard/reports/_components/export-reports-dialog.tsx` | Modify | Select "Jenis Data", PJUM nonaktif untuk signage, nama file |

---

### Task 1: Konversi laporan → baris ekspor signage

**Files:**
- Create: `lib/signage-export.ts`
- Test: `lib/signage-export.spec.ts`

**Interfaces:**
- Consumes: `SIGNAGE_ITEM_IDS`, `describeSignageCondition` dari `@/lib/signage`; `getChecklistItemMeta` dari `@/lib/checklist-data`; `getJakartaYear`, `getJakartaCurrentQuarter` dari `@/lib/time`; `ReportItemJson` dari `@/types/report`.
- Produces:
  - `type SignageExportReport = { reportNumber: string; createdAt: Date; branchName: string; brand: string | null; storeCode: string | null; storeName: string; bmsNIK: string; bmsName: string; status: string; items: unknown }`
  - `type SignageExportRow = { reportNumber: string; createdAt: Date; quarter: string; branchName: string; brand: string | null; storeCode: string | null; storeName: string; bmsNIK: string; bmsName: string; status: string; itemId: string; itemName: string; material: string; condition: string; notes: string; ahoTicketNumber: string }`
  - `function formatJakartaQuarterLabel(value: Date | string): string`
  - `function toSignageExportRows(report: SignageExportReport): SignageExportRow[]`

- [ ] **Step 1: Tulis spec yang gagal**

Buat `lib/signage-export.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    formatJakartaQuarterLabel,
    toSignageExportRows,
    type SignageExportReport,
} from "./signage-export";

const createdAt = new Date("2026-10-28T03:00:00.000Z");

const baseReport: Omit<SignageExportReport, "items"> = {
    reportNumber: "RPT-001",
    createdAt,
    branchName: "BRANCH A",
    brand: "ALFAMART",
    storeCode: "T001",
    storeName: "Toko Satu",
    bmsNIK: "1001",
    bmsName: "Budi",
    status: "COMPLETED",
};

// Kuartal WIB
assert.equal(formatJakartaQuarterLabel(createdAt), "2026-Q4");
// 2026-12-31 17:30 UTC = 2027-01-01 00:30 WIB
assert.equal(
    formatJakartaQuarterLabel(new Date("2026-12-31T17:30:00.000Z")),
    "2027-Q1",
);

// Satu baris per item signage, urut I11 → I13, item non-signage diabaikan
const rows = toSignageExportRows({
    ...baseReport,
    items: [
        {
            itemId: "A1",
            condition: "BAIK",
            preventiveCondition: null,
            handler: null,
        },
        {
            itemId: "I13",
            preventiveCondition: "TIDAK_ADA",
            condition: "TIDAK_ADA",
            handler: null,
        },
        {
            itemId: "I12",
            preventiveCondition: "NOT_OK",
            condition: "RUSAK",
            handler: "REKANAN",
            signageMaterial: "ACP/Alucopan",
            signageCondition: "PUDAR",
            notes: "Warna hilang, rekondisi ke GS",
            ahoTicketNumber: "AHO-77",
        },
        {
            itemId: "I11",
            preventiveCondition: "OK",
            condition: "BAIK",
            handler: null,
            signageMaterial: "Acrylic",
            signageCondition: "KOTOR",
            notes: "Kusam, rekomendasi cleaning",
        },
    ],
});

const sharedColumns = {
    reportNumber: "RPT-001",
    createdAt,
    quarter: "2026-Q4",
    branchName: "BRANCH A",
    brand: "ALFAMART",
    storeCode: "T001",
    storeName: "Toko Satu",
    bmsNIK: "1001",
    bmsName: "Budi",
    status: "COMPLETED",
};

assert.deepEqual(rows, [
    {
        ...sharedColumns,
        itemId: "I11",
        itemName: "Kondisi Fisik Shop Sign",
        material: "Acrylic",
        condition: "Kotor",
        notes: "Kusam, rekomendasi cleaning",
        ahoTicketNumber: "",
    },
    {
        ...sharedColumns,
        itemId: "I12",
        itemName: "Kondisi Fisik List Plank",
        material: "ACP/Alucopan",
        condition: "Pudar",
        notes: "Warna hilang, rekondisi ke GS",
        ahoTicketNumber: "AHO-77",
    },
    {
        ...sharedColumns,
        itemId: "I13",
        itemName: "Kondisi Fisik Pole Sign",
        material: "-",
        condition: "Tidak Ada",
        notes: "",
        ahoTicketNumber: "",
    },
]);

// Laporan tanpa item signage → kosong
assert.deepEqual(
    toSignageExportRows({
        ...baseReport,
        items: [
            {
                itemId: "A1",
                condition: "RUSAK",
                preventiveCondition: null,
                handler: "BMS",
            },
        ],
    }),
    [],
);

// items bukan array → kosong
assert.deepEqual(toSignageExportRows({ ...baseReport, items: null }), []);

// Item signage tanpa kondisi preventif tidak diekspor
assert.deepEqual(
    toSignageExportRows({
        ...baseReport,
        items: [
            {
                itemId: "I11",
                condition: null,
                preventiveCondition: null,
                handler: null,
            },
        ],
    }),
    [],
);

console.log("signage export tests passed");
```

- [ ] **Step 2: Jalankan spec, pastikan gagal**

Run: `npx tsx lib/signage-export.spec.ts`
Expected: FAIL dengan error modul `./signage-export` tidak ditemukan.

- [ ] **Step 3: Implementasi minimal**

Buat `lib/signage-export.ts`:

```ts
import { getChecklistItemMeta } from "@/lib/checklist-data";
import { SIGNAGE_ITEM_IDS, describeSignageCondition } from "@/lib/signage";
import { getJakartaCurrentQuarter, getJakartaYear } from "@/lib/time";
import type { ReportItemJson } from "@/types/report";

/** Data laporan yang dibutuhkan untuk ekspor signage. */
export type SignageExportReport = {
    reportNumber: string;
    createdAt: Date;
    branchName: string;
    brand: string | null;
    storeCode: string | null;
    storeName: string;
    bmsNIK: string;
    bmsName: string;
    status: string;
    items: unknown;
};

/** Satu baris sheet "Rekap Signage" (satu item signage per laporan). */
export type SignageExportRow = {
    reportNumber: string;
    createdAt: Date;
    /** Kuartal WIB dari `createdAt`, mis. "2026-Q4". */
    quarter: string;
    branchName: string;
    brand: string | null;
    storeCode: string | null;
    storeName: string;
    bmsNIK: string;
    bmsName: string;
    status: string;
    itemId: string;
    itemName: string;
    material: string;
    condition: string;
    notes: string;
    ahoTicketNumber: string;
};

const RECORDED_PREVENTIVE_CONDITIONS = new Set(["OK", "NOT_OK", "TIDAK_ADA"]);

export function formatJakartaQuarterLabel(value: Date | string): string {
    return `${getJakartaYear(value)}-Q${getJakartaCurrentQuarter(value)}`;
}

function getSignageConditionLabel(item: ReportItemJson): string {
    if (item.preventiveCondition === "TIDAK_ADA") return "Tidak Ada";
    return describeSignageCondition(item)?.label ?? "-";
}

function getSignageMaterialLabel(item: ReportItemJson): string {
    if (item.preventiveCondition === "TIDAK_ADA") return "-";
    return item.signageMaterial?.trim() || "-";
}

/** Laporan → baris ekspor signage, urut I11 → I13. */
export function toSignageExportRows(
    report: SignageExportReport,
): SignageExportRow[] {
    const items = Array.isArray(report.items)
        ? (report.items as ReportItemJson[])
        : [];
    const quarter = formatJakartaQuarterLabel(report.createdAt);

    return SIGNAGE_ITEM_IDS.flatMap((itemId) => {
        const item = items.find(
            (candidate) =>
                candidate?.itemId === itemId &&
                RECORDED_PREVENTIVE_CONDITIONS.has(
                    candidate.preventiveCondition ?? "",
                ),
        );
        if (!item) return [];

        return [
            {
                reportNumber: report.reportNumber,
                createdAt: report.createdAt,
                quarter,
                branchName: report.branchName,
                brand: report.brand,
                storeCode: report.storeCode,
                storeName: report.storeName,
                bmsNIK: report.bmsNIK,
                bmsName: report.bmsName,
                status: report.status,
                itemId,
                itemName:
                    getChecklistItemMeta(itemId)?.itemName ??
                    item.itemName ??
                    itemId,
                material: getSignageMaterialLabel(item),
                condition: getSignageConditionLabel(item),
                notes: item.notes?.trim() ?? "",
                ahoTicketNumber: item.ahoTicketNumber?.trim() ?? "",
            },
        ];
    });
}
```

- [ ] **Step 4: Jalankan spec, pastikan lulus**

Run: `npx tsx lib/signage-export.spec.ts`
Expected: `signage export tests passed`

- [ ] **Step 5: Commit**

Buat task note `docs/agent-notes/2026-10-28-HHMM-signage-export-rows.md` dari `TEMPLATE.md`, lalu:

```bash
git add lib/signage-export.ts lib/signage-export.spec.ts docs/agent-notes/<note>.md
git commit -m "feat(export): map signage items to export rows"
```

---

### Task 2: Server — sheet "signage" di API ekspor

**Files:**
- Modify: `app/admin/export/queries.ts` (import di atas; fungsi baru setelah `fetchReportExportRows`, sebelum komentar `// ─── Query: Sheet 2 — Rekap Material`)
- Modify: `app/api/admin/export/access.ts:3-7` dan `:22-25`
- Modify: `app/api/admin/export/access.spec.ts` (assertion baru sebelum `console.log("limited export access assertions passed");`)
- Modify: `app/api/admin/export/route.ts`

**Interfaces:**
- Consumes: `toSignageExportRows`, `SignageExportRow` (Task 1); `SIGNAGE_ITEM_IDS` dari `@/lib/signage`; helper lokal `buildReportWhere` di `queries.ts`; helper lokal `textCell`, `dateCell`, `buildSheet` di `route.ts`.
- Produces:
  - `fetchSignageExportRows(filter: ExportFilter): Promise<SignageExportRow[]>` di `app/admin/export/queries.ts`
  - `ExportSheet` sekarang mencakup `"signage"`
  - Body `POST /api/admin/export` menerima `sheets: ["signage"]` → file XLSX dengan sheet `Rekap Signage`

- [ ] **Step 1: Tulis assertion akses yang gagal**

Di `app/api/admin/export/access.spec.ts`, sisipkan tepat sebelum baris `console.log("limited export access assertions passed");`:

```ts
for (const role of ["BMC", "BNM_MANAGER"] as const) {
    assert.deepEqual(
        resolveLimitedExportScope({
            role,
            requestedSheets: ["signage"],
            selectedBranches: [],
            assignedBranches,
        }),
        { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
    );
}

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["signage"],
        selectedBranches: ["FOREIGN BRANCH"],
        assignedBranches,
    }),
    {
        ok: false,
        status: 403,
        error: "Anda tidak punya akses ke cabang ini",
    },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["reports", "signage"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);
```

- [ ] **Step 2: Jalankan spec, pastikan gagal**

Run: `npx tsx app/api/admin/export/access.spec.ts`
Expected: FAIL. `AssertionError`, dengan actual `{ ok: false, status: 403, error: "Forbidden" }` untuk `requestedSheets: ["signage"]`.

- [ ] **Step 3: Izinkan sheet signage di `access.ts`**

Ganti:

```ts
export type ExportSheet =
    | "reports"
    | "materials"
    | "pjum"
    | "preventive";
```

menjadi:

```ts
export type ExportSheet =
    | "reports"
    | "materials"
    | "pjum"
    | "preventive"
    | "signage";
```

Lalu ganti:

```ts
    const isAllowedSheet =
        requestedSheet === "reports" ||
        requestedSheet === "pjum" ||
        requestedSheet === "preventive";
```

menjadi:

```ts
    const isAllowedSheet =
        requestedSheet === "reports" ||
        requestedSheet === "pjum" ||
        requestedSheet === "preventive" ||
        requestedSheet === "signage";
```

- [ ] **Step 4: Jalankan spec akses, pastikan lulus**

Run: `npx tsx app/api/admin/export/access.spec.ts`
Expected: `limited export access assertions passed` lalu `branch filter scope assertions passed`

- [ ] **Step 5: Tambah query `fetchSignageExportRows` di `queries.ts`**

Tambahkan import, tepat setelah baris `import { isRecordedPreventiveReport } from "@/lib/report-preventive";`:

```ts
import { SIGNAGE_ITEM_IDS } from "@/lib/signage";
import {
    toSignageExportRows,
    type SignageExportRow,
} from "@/lib/signage-export";
```

Tambahkan fungsi berikut tepat sebelum komentar `// ─── Query: Sheet 2 — Rekap Material ───...`:

```ts
// ─── Query: Sheet 5 — Rekap Signage (I11–I13) ────────────────────────────────

export async function fetchSignageExportRows(
    filter: ExportFilter,
): Promise<SignageExportRow[]> {
    try {
        // Status PJUM tidak berlaku untuk rekap signage.
        const where = buildReportWhere({ ...filter, pjumStatus: undefined });
        (where.AND as Prisma.ReportWhereInput[]).push({
            OR: SIGNAGE_ITEM_IDS.map((itemId) => ({
                items: { array_contains: [{ itemId }] },
            })),
        });

        const CHUNK_SIZE = 5000;
        let skip = 0;
        const rows: SignageExportRow[] = [];

        while (true) {
            const chunk = await prisma.report.findMany({
                where,
                orderBy: [{ createdAt: "asc" }, { reportNumber: "asc" }],
                skip,
                take: CHUNK_SIZE,
                select: {
                    reportNumber: true,
                    createdAt: true,
                    branchName: true,
                    storeCode: true,
                    store: { select: { brand: true } },
                    storeName: true,
                    createdByNIK: true,
                    createdBy: { select: { name: true } },
                    status: true,
                    items: true,
                },
            });

            if (chunk.length === 0) {
                break;
            }

            for (const r of chunk) {
                rows.push(
                    ...toSignageExportRows({
                        reportNumber: r.reportNumber,
                        createdAt: r.createdAt,
                        branchName: r.branchName,
                        brand: r.store?.brand ?? null,
                        storeCode: r.storeCode,
                        storeName: r.storeName,
                        bmsNIK: r.createdByNIK,
                        bmsName: r.createdBy.name,
                        status: r.status,
                        items: r.items,
                    }),
                );
            }
            skip += CHUNK_SIZE;
        }

        return rows;
    } catch (error) {
        logger.error(
            {
                operation: "fetchSignageExportRows",
                filter: JSON.stringify(filter),
            },
            "Failed to fetch signage export rows",
            error,
        );
        throw error;
    }
}
```

- [ ] **Step 6: Tambah sheet builder dan wiring di `route.ts`**

6a. Di blok import dari `@/app/admin/export/queries`, tambahkan `fetchSignageExportRows,` setelah `fetchPreventiveExportRows,`:

```ts
import {
  fetchReportExportRows,
  fetchMaterialExportRows,
  fetchPjumExportRows,
  fetchPreventiveExportRows,
  fetchSignageExportRows,
  type ExportFilter,
} from "@/app/admin/export/queries";
```

6b. Tambahkan builder tepat sebelum komentar `/**\n * Konversi array-of-arrays ke WorkSheet dan set auto column width.` (sebelum `function buildSheet`):

```ts
function buildSignageSheet(
  rows: Awaited<ReturnType<typeof fetchSignageExportRows>>,
): XLSX.WorkSheet {
  const headers = [
    "No. Laporan",
    "Tanggal Laporan",
    "Kuartal",
    "Branch",
    "Brand",
    "Kode Toko",
    "Nama Toko",
    "NIK BMS",
    "Nama BMS",
    "Status Laporan",
    "Kode Item",
    "Nama Item",
    "Material",
    "Kondisi",
    "Catatan",
    "No. Tiket AHO",
  ];

  const data: XLSX.CellObject[][] = [
    headers.map((h) => textCell(h)),
    ...rows.map((r) => [
      textCell(r.reportNumber),
      dateCell(r.createdAt),
      textCell(r.quarter),
      textCell(r.branchName),
      textCell(getStoreBrandExportLabel(r.brand)),
      textCell(r.storeCode),
      textCell(r.storeName),
      textCell(r.bmsNIK),
      textCell(r.bmsName),
      textCell(getReportStatusLabel(r.status)),
      textCell(r.itemId),
      textCell(r.itemName),
      textCell(r.material),
      textCell(r.condition),
      textCell(r.notes),
      textCell(r.ahoTicketNumber),
    ]),
  ];

  return buildSheet(data, headers.length);
}
```

6c. Ubah tipe `sheets` di body:

```ts
    sheets?: ("reports" | "materials" | "pjum" | "preventive" | "signage")[];
```

6d. Ganti blok fetch `const [reportRows, materialRows, pjumRows, preventiveRows] = await Promise.all([...])` menjadi:

```ts
    const [reportRows, materialRows, pjumRows, preventiveRows, signageRows] =
      await Promise.all([
        requestedSheets.includes("reports")
          ? fetchReportExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("materials")
          ? fetchMaterialExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("pjum")
          ? fetchPjumExportRows(filter)
          : Promise.resolve([]),
        requestedSheets.includes("preventive")
          ? fetchPreventiveExportRows(filter, branchResolutionMode)
          : Promise.resolve([]),
        requestedSheets.includes("signage")
          ? fetchSignageExportRows(filter)
          : Promise.resolve([]),
      ]);
```

6e. Di cabang `if (splitFiles) { ... }`, tambahkan blok ini tepat setelah blok `if (requestedSheets.includes("preventive") && preventiveRows.length > 0) { ... }` dan sebelum `const durationMs`:

```ts
      if (requestedSheets.includes("signage") && signageRows.length > 0) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          buildSignageSheet(signageRows),
          "Rekap Signage",
        );
        const buf = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsx",
        });
        files.push({
          name: `${baseFileName}-signage.xlsx`,
          data: Buffer.from(buf).toString("base64"),
        });
      }
```

6f. Di workbook gabungan, tambahkan tepat setelah blok `if (requestedSheets.includes("preventive")) { ... }` dan sebelum `const buf = XLSX.write(wb, ...)`:

```ts
    if (requestedSheets.includes("signage")) {
      XLSX.utils.book_append_sheet(
        wb,
        buildSignageSheet(signageRows),
        "Rekap Signage",
      );
    }
```

6g. Di log `"Export XLSX (combined) completed"`, ganti hitungan `rows`:

```ts
        rows:
          reportRows.length +
          materialRows.length +
          pjumRows.length +
          preventiveRows.length +
          signageRows.length,
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "^\.next/" | head -20`
Expected: tidak ada error di `app/admin/export/queries.ts`, `app/api/admin/export/route.ts`, `app/api/admin/export/access.ts`, atau `lib/signage-export.ts`.

Kalau ada error tipe pada `items: { array_contains: [{ itemId }] }`, ubah menjadi `items: { array_contains: [{ itemId }] as Prisma.InputJsonValue }`, lalu jalankan ulang.

- [ ] **Step 8: Jalankan ulang spec Task 1 dan Task 2**

Run: `npx tsx lib/signage-export.spec.ts && npx tsx app/api/admin/export/access.spec.ts`
Expected: `signage export tests passed`, `limited export access assertions passed`, `branch filter scope assertions passed`

- [ ] **Step 9: Commit**

Buat task note `docs/agent-notes/2026-10-28-HHMM-signage-export-api.md` dari `TEMPLATE.md`, lalu:

```bash
git add app/admin/export/queries.ts app/api/admin/export/access.ts app/api/admin/export/access.spec.ts app/api/admin/export/route.ts docs/agent-notes/<note>.md
git commit -m "feat(export): add signage sheet to XLSX export API"
```

---

### Task 3: Dialog — pilihan "Jenis Data"

**Files:**
- Modify: `app/dashboard/reports/_components/export-reports-dialog.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/export` dengan `sheets: ["signage"]` (Task 2).
- Produces: UI saja. Tidak ada ekspor baru.

- [ ] **Step 1: Tambah opsi Jenis Data**

Ganti:

```ts
const STATUS_OPTIONS = [
    { value: "all", label: "Semua Status" },
    ...REPORT_STATUS_OPTIONS,
];
```

menjadi:

```ts
const STATUS_OPTIONS = [
    { value: "all", label: "Semua Status" },
    ...REPORT_STATUS_OPTIONS,
];

type ExportDataType = "reports" | "signage";

const DATA_TYPE_OPTIONS: { value: ExportDataType; label: string }[] = [
    { value: "reports", label: "Rekap Laporan" },
    { value: "signage", label: "Kondisi Signage (I.11–I.13)" },
];
```

- [ ] **Step 2: Tambah state dan turunannya**

Ganti:

```ts
    // Filters for export (independent of table filters)
    const [bmsQuery, setBmsQuery] = useState("");
```

menjadi:

```ts
    // Filters for export (independent of table filters)
    const [dataType, setDataType] = useState<ExportDataType>("reports");
    const isSignage = dataType === "signage";
    const [bmsQuery, setBmsQuery] = useState("");
```

- [ ] **Step 3: Kirim sheet dan nama file sesuai Jenis Data**

Ganti:

```ts
                        pjumStatus: 
                            status === "COMPLETED" && pjumStatus !== "ALL"
                                ? pjumStatus
                                : undefined,
```

menjadi:

```ts
                        pjumStatus:
                            !isSignage &&
                            status === "COMPLETED" &&
                            pjumStatus !== "ALL"
                                ? pjumStatus
                                : undefined,
```

Ganti:

```ts
                    sheets: ["reports"], // Only export reports sheet
```

menjadi:

```ts
                    sheets: [dataType],
```

Ganti:

```ts
            a.download = `Rekap_Laporan_Maintenance_${format(new Date(), "yyyyMMdd")}.xlsx`;
```

menjadi:

```ts
            const filePrefix = isSignage
                ? "Rekap_Signage"
                : "Rekap_Laporan_Maintenance";
            a.download = `${filePrefix}_${format(new Date(), "yyyyMMdd")}.xlsx`;
```

- [ ] **Step 4: Render Select "Jenis Data" sebagai field pertama**

Ganti:

```tsx
                <div className="grid gap-4 ">
                    {showBranchFilter ? (
```

menjadi:

```tsx
                <div className="grid gap-4 ">
                    <div className="grid gap-2">
                        <Label>Jenis Data</Label>
                        <Select
                            value={dataType}
                            onValueChange={(val) => {
                                setDataType(val as ExportDataType);
                                if (val === "signage") {
                                    setPjumStatus("ALL");
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Rekap Laporan" />
                            </SelectTrigger>
                            <SelectContent>
                                {DATA_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {showBranchFilter ? (
```

- [ ] **Step 5: Nonaktifkan Status PJUM untuk signage**

Ganti:

```tsx
                            onValueChange={setPjumStatus}
                            disabled={status !== "COMPLETED"}
```

menjadi:

```tsx
                            onValueChange={setPjumStatus}
                            disabled={isSignage || status !== "COMPLETED"}
```

Ganti:

```tsx
                        {status !== "COMPLETED" && (
                            <p className="text-[0.8rem] text-muted-foreground">
                                Pilih status "Selesai" untuk mengaktifkan filter ini.
                            </p>
                        )}
```

menjadi:

```tsx
                        {isSignage ? (
                            <p className="text-[0.8rem] text-muted-foreground">
                                Tidak berlaku untuk data signage.
                            </p>
                        ) : status !== "COMPLETED" ? (
                            <p className="text-[0.8rem] text-muted-foreground">
                                Pilih status "Selesai" untuk mengaktifkan filter ini.
                            </p>
                        ) : null}
```

- [ ] **Step 6: Type-check dan lint file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "^\.next/" | head -20`
Expected: tidak ada error di `export-reports-dialog.tsx`.

Run: `npx eslint app/dashboard/reports/_components/export-reports-dialog.tsx lib/signage-export.ts app/admin/export/queries.ts app/api/admin/export/route.ts app/api/admin/export/access.ts`
Expected: tidak ada error baru. Temuan yang sudah ada sebelumnya boleh dibiarkan, tapi catat di task note.

- [ ] **Step 7: Commit**

Buat task note `docs/agent-notes/2026-10-28-HHMM-signage-export-dialog.md` dari `TEMPLATE.md`, lalu:

```bash
git add app/dashboard/reports/_components/export-reports-dialog.tsx docs/agent-notes/<note>.md
git commit -m "feat(reports): export signage condition from report dialog"
```

---

### Task 4: Verifikasi akhir

**Files:** tidak ada perubahan kode. Kalau perlu perbaikan, kembali ke task terkait.

- [ ] **Step 1: Semua spec terkait**

Run: `npx tsx lib/signage-export.spec.ts && npx tsx lib/signage.spec.ts && npx tsx app/api/admin/export/access.spec.ts`
Expected: ketiganya mencetak pesan "passed".

- [ ] **Step 2: Build produksi**

Run: `npm run build`
Expected: `Compiled successfully`. Kalau gagal karena `.next/dev/types/routes.d.ts` korup ("Unterminated regular expression literal"), minta izin user untuk menghapus `.next/dev/types`, lalu build ulang.

- [ ] **Step 3: Cek data lokal (opsional, read-only)**

Pastikan filter JSON menemukan laporan bersignage. Hitung jumlahnya lewat SQL read-only:

```sql
SELECT COUNT(*) FROM "Report"
WHERE status NOT IN ('DRAFT')
  AND items @> '[{"itemId":"I11"}]'::jsonb;
```

Expected: angka ≥ 0 tanpa error. Kalau 0, ekspor signage memang akan menghasilkan sheet berisi header saja, dan itu benar.

- [ ] **Step 4: Cek manual di browser (dev server, user login sendiri)**

1. Buka `/dashboard/reports` sebagai ADMIN, klik **Ekspor XLSX**.
2. Pastikan field pertama adalah **Jenis Data**, dengan default "Rekap Laporan".
3. Pilih "Kondisi Signage (I.11–I.13)". Pastikan Status PJUM nonaktif dan muncul teks "Tidak berlaku untuk data signage."
4. Klik **Unduh File**. Pastikan file `Rekap_Signage_yyyyMMdd.xlsx` punya sheet `Rekap Signage` dengan 16 kolom sesuai Global Constraints, tanpa kolom Handler.
5. Kembali ke "Rekap Laporan" dan unduh. Pastikan file `Rekap_Laporan_Maintenance_*.xlsx` tidak berubah dari sebelumnya.
6. Ulangi langkah 3–4 sebagai BMC atau BNM. Pastikan ekspor berhasil (bukan 403) dan hanya berisi cabangnya sendiri.
