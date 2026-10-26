# AHO Import Streaming Parse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import XLSX tiket AHO kembali berfungsi untuk ekspor IRIS berukuran besar (saat ini 72 MB, sheet XML 565 MB), dengan cara membaca file secara streaming di browser dan hanya mengirim baris New/Progress ke server action.

**Architecture:** Parser murni baru `lib/aho-import/parse-aho-xlsx.ts` meng-unzip file bertahap dengan `fflate` dan membaca XML per `<row>`, jadi tidak pernah membuat string raksasa. Parser dijalankan di dialog import (browser) dan menghasilkan payload ringkas (`lib/aho-import/import-payload.ts`, divalidasi Zod). Server action `adminImportAhoTickets` menerima payload itu, memvalidasi ulang, lalu menjalankan logika sinkronisasi DB yang **sudah ada tanpa diubah** (cek toko → upsert → delete → simpan Tanggal Cetak). Tidak ada background job, worker server, queue, cron, atau service baru.

**Tech Stack:** Next.js 16 (App Router, server action), React 19, TypeScript 5, Zod 4, `fflate` 0.8.x (unzip streaming), Prisma 7 / PostgreSQL, test berupa spec `node:assert` yang dijalankan dengan `npx tsx`.

## Latar Belakang (akar masalah, sudah direproduksi)

- File `rep_problem_20261026091033.xlsx` berisi `xl/worksheets/sheet1.xml` sebesar **565.192.737 karakter** (`A1:AN246184`, inline string). Batas string V8 = **536.870.888**.
- `XLSX.read()` (SheetJS 0.18.5) gagal membuat string itu, **menelan error-nya**, lalu mengembalikan workbook dengan `Sheets = {}`. `ws["!ref"]` di `parseFormatBXlsx` melempar `TypeError`, ditangkap `catch` → "Gagal melakukan sinkronisasi (Kesalahan server)".
- Prototype parser di plan ini sudah dijalankan pada file asli: **24,6 detik, 246.176 baris dibaca, 10.646 baris New/Progress, payload JSON 1,2 MB, lolos skema Zod**, Tanggal Cetak `2026-10-26T02:08:52.000Z` (= 09:08:52 WIB).
- Di dalam zip IRIS, `sheet1.xml` muncul **sebelum** `workbook.xml`, sehingga parser butuh dua pass: (1) baca `workbook.xml`, relasi, dan `sharedStrings.xml`; (2) stream sheet.

## Global Constraints

- **Tanpa background job / service baru.** Jangan mengaktifkan atau mengubah `app/api/admin/import-aho/**`, `lib/jobs/aho-import.ts`, `lib/jobs/aho-import-worker.ts`.
- **Jangan `git add` / `git commit` apa pun.** Kerjakan langsung di branch `main`, biarkan semua perubahan unstaged sampai user memberi perintah eksplisit.
- Logika sinkronisasi DB di `adminImportAhoTickets` (mulai dari "Validasi Kode Toko ke database" sampai akhir fungsi) **tidak boleh berubah perilakunya**.
- Server wajib memvalidasi ulang payload dengan Zod dan memfilter ulang status New/Progress — jangan percaya data dari client.
- Aturan parsing harus sama dengan parser lama: alias header (`kode toko`, `no. problem`/`no problem`, `status`, `kode cabang existing`, `cabang existing`/`nama cabang existing`), pencarian "Tanggal Cetak" di kolom A pada 21 baris pertama, pencarian header pada 51 baris pertama, `storeCode` di-uppercase, prefix `DC ` di nama cabang dibuang, baris tanpa kode toko/no problem/status dilewati.
- Tanggal Cetak dianggap **WIB (UTC+7)** dan diparse manual (bukan `new Date(string)`, karena hasilnya berbeda antar browser).
- Teks UI dan pesan error berbahasa Indonesia.
- `bodySizeLimit: "70mb"` di `next.config.ts` **tidak diubah** (payload baru ~1,2 MB).
- Komponen UI: shadcn/ui, jangan menambah spacing manual pada komponen shadcn (`AI_RULES.md`).
- Dependensi baru hanya `fflate` (sudah ada di `node_modules` sebagai dependensi transitif `@react-pdf/renderer`, versi 0.8.3).
- Wajib membuat task note `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (waktu Asia/Jakarta) sesuai `AGENTS.md`.

## File Structure

| File | Status | Tanggung jawab |
|---|---|---|
| `lib/aho-import/import-payload.ts` | Create | Kontrak data browser → server: skema Zod, tipe, `normalizeAhoStatus` |
| `lib/aho-import/import-payload.spec.ts` | Create | Test kontrak payload |
| `lib/aho-import/parse-aho-xlsx.ts` | Create | Parser XLSX streaming (fflate + scanner XML per baris), murni tanpa DOM/Node API |
| `lib/aho-import/parse-aho-xlsx.spec.ts` | Create | Test parser dengan fixture XLSX buatan (inline string, shared strings, chunk kecil, error) |
| `scripts/smoke-aho-xlsx-parse.ts` | Create | Smoke test parser ke file IRIS asli (path dari argumen) |
| `package.json`, `package-lock.json` | Modify | Tambah `fflate` ke `dependencies` + script `smoke:aho-xlsx` |
| `app/dashboard/aho-tickets/actions.ts` | Modify | Hapus parser SheetJS; `adminImportAhoTickets` menerima payload |
| `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx` | Modify | Parse file di browser, progress dua tahap, error baca file ditampilkan jelas |
| `docs/agent-notes/2026-10-26-HHMM-aho-import-streaming-parse.md` | Create | Task note wajib |

---

### Task 1: Kontrak payload import

**Files:**
- Create: `lib/aho-import/import-payload.ts`
- Test: `lib/aho-import/import-payload.spec.ts`

**Interfaces:**
- Consumes: `zod` (`z.iso.datetime()`, Zod 4)
- Produces:
  - `AHO_ACTIVE_STATUSES: readonly ["New", "Progress"]`
  - `type AhoActiveStatus = "New" | "Progress"`
  - `AHO_IMPORT_MAX_ROWS: number` (500_000)
  - `normalizeAhoStatus(raw: string): AhoActiveStatus | null`
  - `ahoImportPayloadSchema` (Zod object)
  - `type AhoImportPayload = { printDate: string | null; totalRows: number; skippedNonActive: number; rows: AhoImportRow[] }`
  - `type AhoImportRow = { storeCode: string; problemNo: string; status: string; branchCode: string; branchName: string }`

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/aho-import/import-payload.spec.ts`:

```ts
import assert from "node:assert/strict";

import { AHO_IMPORT_MAX_ROWS, ahoImportPayloadSchema, normalizeAhoStatus } from "./import-payload";

assert.equal(normalizeAhoStatus("Progress"), "Progress");
assert.equal(normalizeAhoStatus(" PROGRESS "), "Progress");
assert.equal(normalizeAhoStatus("new"), "New");
assert.equal(normalizeAhoStatus("Closed"), null);
assert.equal(normalizeAhoStatus("Solve"), null);
assert.equal(normalizeAhoStatus(""), null);

const validRow = {
    storeCode: " t001 ",
    problemNo: "P-001",
    status: "Progress",
    branchCode: "G001",
    branchName: "SIDOARJO",
};
const base = { printDate: "2026-10-26T02:08:52.000Z", totalRows: 1, skippedNonActive: 0, rows: [validRow] };

const ok = ahoImportPayloadSchema.safeParse(base);
assert.equal(ok.success, true);
if (ok.success) assert.equal(ok.data.rows[0].storeCode, "T001");

assert.equal(ahoImportPayloadSchema.safeParse({ ...base, printDate: null, rows: [] }).success, true);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, printDate: "26-Oct-2026 - 09:08:52" }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, rows: [{ ...validRow, storeCode: "  " }] }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, rows: [{ ...validRow, problemNo: "" }] }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, totalRows: -1 }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse("rep_problem.xlsx").success, false);
assert.ok(AHO_IMPORT_MAX_ROWS >= 300_000);

console.log("import-payload.spec: all assertions passed");
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx tsx lib/aho-import/import-payload.spec.ts`
Expected: FAIL — `Cannot find module './import-payload'` (atau `ERR_MODULE_NOT_FOUND`).

- [ ] **Step 3: Implementasi**

Buat `lib/aho-import/import-payload.ts`:

```ts
// Kontrak data import tiket AHO yang dikirim browser → server action.
// Dipakai di dua sisi: parser XLSX (client) dan adminImportAhoTickets (server).

import { z } from "zod";

export const AHO_ACTIVE_STATUSES = ["New", "Progress"] as const;
export type AhoActiveStatus = (typeof AHO_ACTIVE_STATUSES)[number];

// Snapshot YTD Oktober 2026 berisi ~246k baris; batas ini jauh di atasnya
// tapi tetap mencegah payload liar.
export const AHO_IMPORT_MAX_ROWS = 500_000;

/** "progress" / "PROGRESS " → "Progress"; status selain New/Progress → null. */
export function normalizeAhoStatus(raw: string): AhoActiveStatus | null {
    const trimmed = raw.trim();
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    return (AHO_ACTIVE_STATUSES as readonly string[]).includes(normalized)
        ? (normalized as AhoActiveStatus)
        : null;
}

const ahoImportRowSchema = z.object({
    storeCode: z.string().trim().toUpperCase().min(1).max(50),
    problemNo: z.string().trim().min(1).max(100),
    status: z.string().trim().min(1).max(50),
    branchCode: z.string().trim().max(100),
    branchName: z.string().trim().max(200),
});

export const ahoImportPayloadSchema = z.object({
    printDate: z.iso.datetime().nullable(),
    totalRows: z.number().int().min(0),
    skippedNonActive: z.number().int().min(0),
    rows: z.array(ahoImportRowSchema).max(AHO_IMPORT_MAX_ROWS),
});

export type AhoImportPayload = z.infer<typeof ahoImportPayloadSchema>;
export type AhoImportRow = AhoImportPayload["rows"][number];
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npx tsx lib/aho-import/import-payload.spec.ts`
Expected: `import-payload.spec: all assertions passed`

- [ ] **Step 5: Jangan commit**

Biarkan file unstaged. Jangan jalankan `git add` / `git commit` sampai user memerintahkan.

---

### Task 2: Parser XLSX streaming

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `lib/aho-import/parse-aho-xlsx.ts`
- Create: `scripts/smoke-aho-xlsx-parse.ts`
- Test: `lib/aho-import/parse-aho-xlsx.spec.ts`

**Interfaces:**
- Consumes (Task 1): `normalizeAhoStatus`, `type AhoImportPayload`, `type AhoImportRow` dari `./import-payload`
- Produces:
  - `parseAhoXlsx(data: Uint8Array, options?: ParseAhoXlsxOptions): Promise<ParseAhoXlsxResult>`
  - `type ParseAhoXlsxOptions = { chunkSize?: number; onProgress?: (fraction: number) => void }`
  - `type ParseAhoXlsxResult = { ok: true; payload: AhoImportPayload } | { ok: false; error: string }`
  - `parseIrisPrintDate(raw: string): string | null` (ISO UTC)
  - `decodeXmlEntities(text: string): string`

- [ ] **Step 1: Tambah dependensi `fflate`**

Run: `npm install fflate@^0.8.3`
Expected: `package.json` → `"dependencies"` berisi `"fflate": "^0.8.3"`; tidak ada error.

Lalu tambahkan script ini ke blok `"scripts"` di `package.json`, tepat setelah baris `"smoke:react-pdf": ...`:

```json
    "smoke:aho-xlsx": "tsx scripts/smoke-aho-xlsx-parse.ts",
```

- [ ] **Step 2: Tulis test yang gagal**

Buat `lib/aho-import/parse-aho-xlsx.spec.ts`:

```ts
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";

import { decodeXmlEntities, parseAhoXlsx, parseIrisPrintDate } from "./parse-aho-xlsx";

// ─── Fixture builders ────────────────────────────────────────────────────────

const WORKBOOK_XML =
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan Masalah IRIS" sheetId="1" r:id="rId1"/></sheets></workbook>';
const WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';

const COLS = "ABCDEFGHIJ";
const inline = (ref: string, text: string) =>
    `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
const row = (r: number, cells: string[]) =>
    `<row r="${r}">${cells.map((text, i) => (text === "" ? `<c r="${COLS[i]}${r}"/>` : inline(`${COLS[i]}${r}`, text))).join("")}</row>`;

const HEADER = ["No", "Kode Cabang Existing", "Nama Cabang Existing", "No. Problem", "Kode Toko", "Nama Toko", "Status"];

function sheetXml(rows: string[]) {
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

/** Urutan entri meniru file IRIS asli: sheet1.xml SEBELUM workbook.xml. */
function buildXlsx(sheet: string, extra: Record<string, string> = {}) {
    return zipSync({
        "[Content_Types].xml": strToU8("<Types/>"),
        "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
        "xl/worksheets/sheet1.xml": strToU8(sheet),
        "xl/workbook.xml": strToU8(WORKBOOK_XML),
        ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, strToU8(v)])),
    });
}

const irisSheet = sheetXml([
    row(1, ["Laporan Masalah IRIS (Helpdesk Alfamart)"]),
    row(3, ["Divisi", ": Maintenance &amp; Building"]),
    row(6, ["Tanggal Cetak", ": 26-Oct-2026 - 09:08:52"]),
    row(8, HEADER),
    row(9, ["1", "G001", "DC SIDOARJO", "P-001", "t001", "TOKO A", "Progress"]),
    row(10, ["2", "G001", "SIDOARJO", "P-002", "T002", "TOKO B &amp; C", "Closed"]),
    row(11, ["3", "G002", "DC MALANG", "P-003", "T003", "TOKO É", "new"]),
    row(12, ["4", "", "", "", "T004", "TOKO D", "Progress"]),
    '<row r="13"/>',
    row(14, ["5", "G002", "MALANG", "P-005", "T005", "TOKO E", "Solve"]),
]);

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
    // Helpers
    assert.equal(decodeXmlEntities("A &amp; B &lt;x&gt; &#39;y&#x27;"), "A & B <x> 'y'");
    assert.equal(parseIrisPrintDate(": 26-Oct-2026 - 09:08:52"), "2026-10-26T02:08:52.000Z");
    assert.equal(parseIrisPrintDate("12 Aug 2026 - 10:50:12"), "2026-08-12T03:50:12.000Z");
    assert.equal(parseIrisPrintDate("01-Jan-2026 - 03:00:00"), "2025-12-31T20:00:00.000Z");
    assert.equal(parseIrisPrintDate("bukan tanggal"), null);

    // Format IRIS (inline string), dipush dalam potongan 7 byte untuk menguji
    // batas potongan di tengah tag XML maupun karakter multi-byte.
    for (const chunkSize of [7, 64 * 1024]) {
        const progress: number[] = [];
        const result = await parseAhoXlsx(buildXlsx(irisSheet), {
            chunkSize,
            onProgress: (f) => progress.push(f),
        });
        assert.equal(result.ok, true, `chunkSize ${chunkSize}`);
        if (!result.ok) return;
        assert.deepEqual(result.payload, {
            printDate: "2026-10-26T02:08:52.000Z",
            totalRows: 4,
            skippedNonActive: 2,
            rows: [
                { storeCode: "T001", problemNo: "P-001", status: "Progress", branchCode: "G001", branchName: "SIDOARJO" },
                { storeCode: "T003", problemNo: "P-003", status: "New", branchCode: "G002", branchName: "MALANG" },
            ],
        });
        assert.equal(progress.at(-1), 1);
    }

    // File yang disimpan ulang dari Excel memakai sharedStrings (t="s")
    const shared = ["Kode Toko", "No. Problem", "Status", "T010", "P-010", "PROGRESS", "Tanggal Cetak", ": 12-Aug-2026 - 10:50:12"];
    const sst = `<sst count="${shared.length}" uniqueCount="${shared.length}">${shared
        .map((s, i) => (i === 3 ? `<si><r><t>T0</t></r><r><t>10</t></r></si>` : `<si><t xml:space="preserve">${s}</t></si>`))
        .join("")}</sst>`;
    const s = (ref: string, idx: number) => `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    const sharedSheet = sheetXml([
        `<row r="2">${s("A2", 6)}${s("B2", 7)}</row>`,
        `<row r="4">${s("A4", 0)}${s("B4", 1)}${s("C4", 2)}</row>`,
        `<row r="5">${s("A5", 3)}${s("B5", 4)}${s("C5", 5)}</row>`,
    ]);
    const sharedResult = await parseAhoXlsx(buildXlsx(sharedSheet, { "xl/sharedStrings.xml": sst }), { chunkSize: 5 });
    assert.deepEqual(sharedResult, {
        ok: true,
        payload: {
            printDate: "2026-08-12T03:50:12.000Z",
            totalRows: 1,
            skippedNonActive: 0,
            rows: [{ storeCode: "T010", problemNo: "P-010", status: "Progress", branchCode: "", branchName: "" }],
        },
    });

    // Header tidak dikenal
    const unknown = await parseAhoXlsx(buildXlsx(sheetXml([row(1, ["Nama", "Alamat"]), row(2, ["A", "B"])])));
    assert.deepEqual(unknown, {
        ok: false,
        error: "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.",
    });

    // Kolom Status tidak ada
    const noStatus = await parseAhoXlsx(buildXlsx(sheetXml([row(1, ["Kode Toko", "No. Problem"]), row(2, ["T1", "P1"])])));
    assert.deepEqual(noStatus, {
        ok: false,
        error: "Kolom wajib tidak ditemukan: status. Pastikan menggunakan file AHO dari IRIS.",
    });

    // Bukan file zip
    const notZip = await parseAhoXlsx(new TextEncoder().encode("Kode Toko,No. Problem,Status"));
    assert.equal(notZip.ok, false);

    console.log("parse-aho-xlsx.spec: all assertions passed");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npx tsx lib/aho-import/parse-aho-xlsx.spec.ts`
Expected: FAIL — `Cannot find module './parse-aho-xlsx'`.

- [ ] **Step 4: Implementasi parser**

Buat `lib/aho-import/parse-aho-xlsx.ts`:

```ts
// Parser streaming untuk laporan AHO dari IRIS Alfamart (.xlsx).
//
// Kenapa tidak memakai library `xlsx` (SheetJS): XLSX.read() mengubah seluruh
// sheet XML menjadi satu string. Ekspor IRIS YTD (Okt 2026) punya sheet XML
// 565 MB, melewati batas string V8 (~536 MB), dan SheetJS menelan error itu
// sehingga sheet hilang tanpa pesan. Di sini zip di-unzip bertahap (fflate) dan
// XML dibaca per <row>, jadi memori tetap kecil berapa pun ukuran file.
//
// Modul ini murni (tanpa DOM/Node API) agar bisa dijalankan di browser dan
// diuji dengan `npx tsx`.

import { Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { normalizeAhoStatus, type AhoImportPayload, type AhoImportRow } from "./import-payload";

export type ParseAhoXlsxResult =
    | { ok: true; payload: AhoImportPayload }
    | { ok: false; error: string };

export type ParseAhoXlsxOptions = {
    /** Ukuran potongan data zip per push. Default 256 KB. */
    chunkSize?: number;
    /** Dipanggil dengan nilai 0..1 selama sheet dibaca. */
    onProgress?: (fraction: number) => void;
};

const DEFAULT_CHUNK_SIZE = 256 * 1024;
const PRINT_DATE_SCAN_ROWS = 20;
const HEADER_SCAN_ROWS = 50;

const TARGET_COLS = {
    storeCode: ["kode toko"],
    problemNo: ["no. problem", "no problem"],
    status: ["status"],
    branchCode: ["kode cabang existing"],
    branchName: ["cabang existing", "nama cabang existing"],
} as const;
type TargetField = keyof typeof TARGET_COLS;

const ERR_NOT_XLSX = "File bukan XLSX yang valid. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.";
const ERR_NO_SHEET = "File XLSX kosong (tidak ada sheet)";
const ERR_UNKNOWN_FORMAT = "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.";

// ─── XML helpers ─────────────────────────────────────────────────────────────

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXmlEntities(text: string): string {
    if (!text.includes("&")) return text;
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
        if (entity[0] === "#") {
            const code = entity[1] === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
            return Number.isNaN(code) ? match : String.fromCodePoint(code);
        }
        return XML_ENTITIES[entity] ?? match;
    });
}

function readAttr(attrs: string, name: string): string | null {
    const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
    return match ? decodeXmlEntities(match[1]) : null;
}

/** Gabungkan semua <t> (termasuk rich-text run), abaikan teks fonetik <rPh>. */
function joinTextRuns(xml: string): string {
    const withoutPhonetic = xml.includes("<rPh") ? xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "") : xml;
    let text = "";
    const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(withoutPhonetic))) text += match[1] ?? "";
    return decodeXmlEntities(text);
}

/** "AB12" → 27 (0-indexed). */
function columnIndexFromRef(ref: string): number {
    let col = 0;
    for (let i = 0; i < ref.length; i++) {
        const code = ref.charCodeAt(i);
        if (code < 65 || code > 90) break;
        col = col * 26 + (code - 64);
    }
    return col - 1;
}

// ─── Tanggal Cetak ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6,
    aug: 7, agu: 7, agt: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
};

/**
 * ": 26-Oct-2026 - 09:08:52" (WIB) → "2026-10-26T02:08:52.000Z".
 * Diparse manual (bukan new Date(string)) karena format ini tidak standar
 * dan hasilnya berbeda antar browser.
 */
export function parseIrisPrintDate(raw: string): string | null {
    const value = raw.replace(/^:\s*/, "").trim();
    const match = /^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})\s*-?\s*(\d{1,2}):(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const month = MONTHS[match[2].toLowerCase()];
    if (month === undefined) return null;
    const [, day, , year, hour, minute, second] = match;
    // IRIS selalu WIB (UTC+7)
    const utcMs = Date.UTC(Number(year), month, Number(day), Number(hour) - 7, Number(minute), Number(second));
    return new Date(utcMs).toISOString();
}

// ─── Zip streaming ───────────────────────────────────────────────────────────

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Push seluruh zip ke fflate Unzip sedikit demi sedikit. `onEntry` memutuskan
 * entri mana yang didekompresi (return handler) atau dilewati (return null).
 * Setiap potongan diselingi yield agar UI browser tetap responsif.
 */
async function streamZip(
    data: Uint8Array,
    chunkSize: number,
    onEntry: (name: string) => ((text: string, final: boolean) => void) | null,
    shouldStop: () => boolean,
    onProgress?: (fraction: number) => void,
): Promise<void> {
    let entryError: unknown = null;
    const unzip = new Unzip((file: UnzipFile) => {
        const handler = onEntry(file.name);
        if (!handler) return;
        const decoder = new TextDecoder("utf-8");
        file.ondata = (err, chunk, final) => {
            if (err) {
                entryError = err;
                return;
            }
            try {
                handler(decoder.decode(chunk, { stream: !final }), final);
            } catch (error) {
                entryError = error;
            }
        };
        file.start();
    });
    unzip.register(UnzipInflate);

    for (let offset = 0; offset < data.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, data.length);
        unzip.push(data.subarray(offset, end), end === data.length);
        if (entryError) throw entryError;
        onProgress?.(end / data.length);
        if (shouldStop()) return;
        await nextTick();
    }
}

/** Buffer teks streaming lalu panggil `onElement` untuk setiap elemen lengkap. */
function createElementScanner(pattern: RegExp, onElement: (match: RegExpExecArray) => void) {
    let buffer = "";
    return (text: string) => {
        buffer += text;
        pattern.lastIndex = 0;
        let consumed = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(buffer))) {
            onElement(match);
            consumed = pattern.lastIndex;
        }
        if (consumed > 0) buffer = buffer.slice(consumed);
    };
}

// ─── Pass 1: workbook, relasi, shared strings ────────────────────────────────

type WorkbookMeta = { sheetPath: string | null; sharedStrings: string[] };

async function readWorkbookMeta(data: Uint8Array, chunkSize: number): Promise<WorkbookMeta> {
    const parts = { workbookXml: null as string | null, relsXml: "" };
    const sharedStrings: string[] = [];
    const scanSharedStrings = createElementScanner(
        /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g,
        (match) => sharedStrings.push(joinTextRuns(match[1] ?? "")),
    );

    await streamZip(
        data,
        chunkSize,
        (name) => {
            if (name === "xl/workbook.xml") {
                parts.workbookXml = "";
                return (text) => (parts.workbookXml += text);
            }
            if (name === "xl/_rels/workbook.xml.rels") return (text) => (parts.relsXml += text);
            if (name === "xl/sharedStrings.xml") return (text) => scanSharedStrings(text);
            return null;
        },
        () => false,
    );

    return { sheetPath: resolveFirstSheetPath(parts.workbookXml, parts.relsXml), sharedStrings };
}

function resolveFirstSheetPath(workbookXml: string | null, relsXml: string): string | null {
    if (workbookXml === null) return null;
    const sheetTag = /<sheet\b([^>]*)>/.exec(workbookXml);
    if (!sheetTag) return null;
    const relId = readAttr(sheetTag[1], "r:id");
    if (relId) {
        const relTags = relsXml.match(/<Relationship\b[^>]*>/g) ?? [];
        for (const tag of relTags) {
            if (readAttr(tag, "Id") !== relId) continue;
            const target = readAttr(tag, "Target");
            if (target) return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
        }
    }
    return "xl/worksheets/sheet1.xml";
}

// ─── Pass 2: baris sheet ─────────────────────────────────────────────────────

function cellText(attrs: string, inner: string | undefined, sharedStrings: string[]): string {
    if (!inner) return "";
    const type = readAttr(attrs, "t");
    if (type === "inlineStr") return joinTextRuns(inner).trim();
    const value = /<v>([\s\S]*?)<\/v>/.exec(inner);
    if (!value) return "";
    if (type === "s") return (sharedStrings[Number(value[1])] ?? "").trim();
    return decodeXmlEntities(value[1]).trim();
}

/** Ambil teks sel per indeks kolom; `wanted` membatasi kolom yang dibaca. */
function readRowCells(
    rowXml: string,
    sharedStrings: string[],
    wanted: Set<number> | null,
): Map<number, string> {
    const cells = new Map<number, string>();
    const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let match: RegExpExecArray | null;
    let col = -1;
    while ((match = re.exec(rowXml))) {
        const ref = readAttr(match[1], "r");
        col = ref ? columnIndexFromRef(ref) : col + 1;
        if (wanted && !wanted.has(col)) continue;
        cells.set(col, cellText(match[1], match[2], sharedStrings));
    }
    return cells;
}

type SheetState = {
    sheetFound: boolean;
    printDate: string | null;
    colIndex: Partial<Record<TargetField, number>> | null;
    wanted: Set<number> | null;
    headerSearchExhausted: boolean;
    rowIndex: number;
    totalRows: number;
    skippedNonActive: number;
    rows: AhoImportRow[];
};

function handleSheetRow(state: SheetState, rowAttrs: string, rowXml: string, sharedStrings: string[]) {
    const rowRef = readAttr(rowAttrs, "r");
    state.rowIndex = rowRef ? Number(rowRef) - 1 : state.rowIndex + 1;

    // ── Sebelum header: cari Tanggal Cetak dan baris header ──
    const colIndex = state.colIndex;
    if (!colIndex) {
        if (state.rowIndex > HEADER_SCAN_ROWS) {
            state.headerSearchExhausted = true;
            return;
        }
        const cells = readRowCells(rowXml, sharedStrings, null);
        const lower = new Map([...cells].map(([col, text]) => [col, text.toLowerCase()]));

        if (
            state.printDate === null &&
            state.rowIndex <= PRINT_DATE_SCAN_ROWS &&
            lower.get(0) === "tanggal cetak"
        ) {
            state.printDate = parseIrisPrintDate(cells.get(1) ?? "");
        }

        const columnOf = (field: TargetField) =>
            [...lower.keys()]
                .sort((a, b) => a - b)
                .find((col) => (TARGET_COLS[field] as readonly string[]).includes(lower.get(col)!));
        if (columnOf("problemNo") !== undefined && columnOf("storeCode") !== undefined) {
            const found: Partial<Record<TargetField, number>> = {};
            for (const field of Object.keys(TARGET_COLS) as TargetField[]) {
                const col = columnOf(field);
                if (col !== undefined) found[field] = col;
            }
            state.colIndex = found;
            state.wanted = new Set(Object.values(found));
        }
        return;
    }

    // ── Baris data: hanya baca kolom yang dibutuhkan ──
    if (colIndex.status === undefined) return;
    const cells = readRowCells(rowXml, sharedStrings, state.wanted);
    const storeCode = (cells.get(colIndex.storeCode!) ?? "").toUpperCase();
    const problemNo = cells.get(colIndex.problemNo!) ?? "";
    const statusRaw = cells.get(colIndex.status) ?? "";
    if (!storeCode || !problemNo || !statusRaw) return;

    state.totalRows++;
    const status = normalizeAhoStatus(statusRaw);
    if (!status) {
        state.skippedNonActive++;
        return;
    }

    const branchCode = colIndex.branchCode !== undefined ? (cells.get(colIndex.branchCode) ?? "") : "";
    let branchName = colIndex.branchName !== undefined ? (cells.get(colIndex.branchName) ?? "") : "";
    if (branchName.toUpperCase().startsWith("DC ")) branchName = branchName.substring(3).trim();

    state.rows.push({ storeCode, problemNo, status, branchCode, branchName });
}

export async function parseAhoXlsx(
    data: Uint8Array,
    options: ParseAhoXlsxOptions = {},
): Promise<ParseAhoXlsxResult> {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

    // Signature zip: "PK" 0x03 0x04
    if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b || data[2] !== 0x03 || data[3] !== 0x04) {
        return { ok: false, error: ERR_NOT_XLSX };
    }

    // Pass 1: di file IRIS, sheet1.xml muncul SEBELUM workbook.xml di dalam zip,
    // jadi lokasi sheet & shared strings harus dibaca dulu di pass terpisah.
    const { sheetPath, sharedStrings } = await readWorkbookMeta(data, chunkSize);
    if (!sheetPath) return { ok: false, error: ERR_NO_SHEET };

    const state: SheetState = {
        sheetFound: false,
        printDate: null,
        colIndex: null,
        wanted: null,
        headerSearchExhausted: false,
        rowIndex: -1,
        totalRows: 0,
        skippedNonActive: 0,
        rows: [],
    };
    const scanRows = createElementScanner(
        /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
        (match) => handleSheetRow(state, match[1], match[2] ?? "", sharedStrings),
    );

    // Pass 2: stream sheet pertama baris per baris
    await streamZip(
        data,
        chunkSize,
        (name) => {
            if (name !== sheetPath) return null;
            state.sheetFound = true;
            return (text) => scanRows(text);
        },
        () => state.headerSearchExhausted,
        options.onProgress,
    );

    if (!state.sheetFound) return { ok: false, error: ERR_NO_SHEET };
    if (!state.colIndex) return { ok: false, error: ERR_UNKNOWN_FORMAT };

    const colIndex = state.colIndex;
    const missing = (["storeCode", "problemNo", "status"] as const).filter((f) => colIndex[f] === undefined);
    if (missing.length > 0) {
        return {
            ok: false,
            error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan menggunakan file AHO dari IRIS.`,
        };
    }

    return {
        ok: true,
        payload: {
            printDate: state.printDate,
            totalRows: state.totalRows,
            skippedNonActive: state.skippedNonActive,
            rows: state.rows,
        },
    };
}
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npx tsx lib/aho-import/parse-aho-xlsx.spec.ts`
Expected: `parse-aho-xlsx.spec: all assertions passed`

- [ ] **Step 6: Buat smoke script untuk file asli**

Buat `scripts/smoke-aho-xlsx-parse.ts`:

```ts
// Smoke test parser AHO ke file ekspor IRIS asli.
// Usage: npm run smoke:aho-xlsx -- "<path ke rep_problem_*.xlsx>"

import { readFileSync } from "node:fs";

import { ahoImportPayloadSchema } from "../lib/aho-import/import-payload";
import { parseAhoXlsx } from "../lib/aho-import/parse-aho-xlsx";

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npm run smoke:aho-xlsx -- "<path ke file .xlsx>"');
        process.exit(1);
    }

    const data = new Uint8Array(readFileSync(filePath));
    const startedAt = Date.now();
    const result = await parseAhoXlsx(data);
    const durationMs = Date.now() - startedAt;

    if (!result.ok) {
        console.error({ durationMs, error: result.error });
        process.exit(1);
    }

    const { rows, ...meta } = result.payload;
    console.log({
        durationMs,
        ...meta,
        activeRows: rows.length,
        payloadKB: Math.round(JSON.stringify(result.payload).length / 1024),
        sample: rows.slice(0, 3),
    });
    console.log("schema valid:", ahoImportPayloadSchema.safeParse(result.payload).success);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 7: Jalankan smoke test ke file asli**

Run: `npm run smoke:aho-xlsx -- "D:\Rendi Elang\Documents\rep_problem_20261026091033.xlsx"`
Expected (angka dari prototype; durasi bisa berbeda ±):

```
{
  durationMs: ~25000,
  printDate: '2026-10-26T02:08:52.000Z',
  totalRows: 246176,
  skippedNonActive: 235530,
  activeRows: 10646,
  payloadKB: 1191,
  sample: [ { storeCode: '1AM7', problemNo: '1AZ1-P-H26-0038', status: 'Progress', branchCode: '1AZ1', branchName: 'Pekanbaru' }, ... ]
}
schema valid: true
```

- [ ] **Step 8: Jangan commit**

Biarkan semua perubahan unstaged.

---

### Task 3: Server action menerima payload

**Files:**
- Modify: `app/dashboard/aho-tickets/actions.ts` (baris 10, 96–242, 307–363)

**Interfaces:**
- Consumes (Task 1): `ahoImportPayloadSchema`, `normalizeAhoStatus`, `type AhoImportRow` dari `@/lib/aho-import/import-payload`
- Produces: `adminImportAhoTickets(input: unknown)` — bentuk return **tidak berubah**: `{ success: boolean; created: number; updated: number; deleted: number; skipped: number; total: number; printDate: Date | null; errors: string[]; duplicates: string[] }`

- [ ] **Step 1: Ganti import SheetJS**

Di `app/dashboard/aho-tickets/actions.ts`, ganti baris 10:

```ts
import * as XLSX from "xlsx";
```

dengan:

```ts
import {
    ahoImportPayloadSchema,
    normalizeAhoStatus,
    type AhoImportRow,
} from "@/lib/aho-import/import-payload";
```

- [ ] **Step 2: Hapus parser lama**

Hapus seluruh blok dari komentar `// ─── Import tiket AHO dari XLSX (Format B — IRIS Alfamart) ───` sampai akhir fungsi `parseFormatBXlsx` (baris 96–242 di versi sekarang: komentar section, `MAX_IMPORT_ERRORS`, `type ParsedRow`, `type ParseFormatBResult`, `function parseFormatBXlsx`). Ganti dengan:

```ts
// ─── Import tiket AHO (hasil parse XLSX di browser) ──────────────────────────
// File XLSX IRIS dibaca di browser oleh lib/aho-import/parse-aho-xlsx.ts karena
// ukurannya melewati batas string V8 bila dibaca utuh dengan SheetJS. Server
// hanya menerima baris ringkas, lalu memvalidasi dan memfilter ulang.

const MAX_IMPORT_ERRORS = 50;
```

Fungsi `upsertAhoTickets` di bawahnya **tidak diubah**.

- [ ] **Step 3: Ubah awal `adminImportAhoTickets`**

Ganti blok ini (signature sampai akhir filter status, baris 307–363 di versi sekarang):

```ts
export async function adminImportAhoTickets(formData: FormData) {
```

…sampai dengan…

```ts
        const buffer = await file.arrayBuffer();
        const { rows: allRows, printDate, error } = parseFormatBXlsx(buffer);
        if (error) return { ...result, errors: [error] };

        result.printDate = printDate;
        result.total = allRows.length;

        // ── Filter: hanya New dan Progress ──
        const VALID_STATUSES = ["New", "Progress"];
        const activeRows: ParsedRow[] = [];

        for (const row of allRows) {
            const status =
                row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase();
            if (VALID_STATUSES.includes(status)) {
                activeRows.push({ ...row, status });
            } else {
                result.skipped++;
            }
        }
```

dengan:

```ts
export async function adminImportAhoTickets(input: unknown) {
    const startTime = Date.now();
    const result = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        total: 0,
        printDate: null as Date | null,
        errors: [] as string[],
        duplicates: [] as string[],
    };

    try {
        const admin = await requireRole(["ADMIN"]);
        const headersList = await headers();

        // CSRF validation
        const origin = headersList.get("origin") ?? "";
        const host = headersList.get("host") ?? "";
        const isValid =
            origin === "" ||
            origin.includes(host) ||
            process.env.NODE_ENV === "development";
        if (!isValid) {
            return { ...result, errors: ["Request tidak valid"] };
        }

        const parsed = ahoImportPayloadSchema.safeParse(input);
        if (!parsed.success) {
            logger.warn(
                {
                    operation: "adminImportAhoTickets",
                    userId: admin.NIK,
                    issues: parsed.error.issues.slice(0, 5),
                },
                "Invalid AHO import payload",
            );
            return { ...result, errors: ["Data import tidak valid. Muat ulang halaman lalu coba lagi."] };
        }

        const payload = parsed.data;
        const printDate = payload.printDate ? new Date(payload.printDate) : null;
        result.printDate = printDate;
        result.total = payload.totalRows;
        result.skipped = payload.skippedNonActive;

        // ── Filter ulang: hanya New dan Progress (jangan percaya client) ──
        const activeRows: AhoImportRow[] = [];
        for (const row of payload.rows) {
            const status = normalizeAhoStatus(row.status);
            if (status) {
                activeRows.push({ ...row, status });
            } else {
                result.skipped++;
            }
        }
```

Sisa fungsi mulai dari `// ── Validasi Kode Toko ke database ──` **tidak diubah** (masih memakai `activeRows`, `printDate`, `admin`, `result`, `startTime`).

- [ ] **Step 4: Pastikan tidak ada sisa referensi lama**

Run: `git grep -n "as XLSX\|XLSX\.\|ParsedRow\|parseFormatBXlsx\|formData" -- app/dashboard/aho-tickets/actions.ts`
Expected: tidak ada output. (Komentar section baru memang menyebut kata "XLSX"; pola di atas sengaja hanya menangkap pemakaian library.)

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "aho-tickets|aho-import"`
Expected: hanya error di `import-aho-tickets-dialog.tsx` (masih mengirim `FormData`, diperbaiki di Task 4). Tidak ada error di `actions.ts` atau `lib/aho-import/*`.

- [ ] **Step 6: Jangan commit**

Biarkan semua perubahan unstaged.

---

### Task 4: Dialog membaca file di browser

**Files:**
- Modify: `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`

**Interfaces:**
- Consumes: `parseAhoXlsx`, `type ParseAhoXlsxResult` (Task 2); `adminImportAhoTickets(input: unknown)` (Task 3)
- Produces: tidak ada (komponen UI; `ImportAhoTicketsDialog` tetap diekspor dengan nama sama)

- [ ] **Step 1: Ganti import dan tambah konstanta**

Ganti blok:

```tsx
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { adminImportAhoTickets } from "../actions";

type ImportResult = Awaited<ReturnType<typeof adminImportAhoTickets>>;



export function ImportAhoTicketsDialog() {
```

dengan:

```tsx
import { toast } from "sonner";
import { parseAhoXlsx, type ParseAhoXlsxResult } from "@/lib/aho-import/parse-aho-xlsx";
import { adminImportAhoTickets } from "../actions";

type ImportResult = Awaited<ReturnType<typeof adminImportAhoTickets>>;
type ImportPhase = "reading" | "syncing";

// Porsi progress bar untuk tahap baca file di browser; sisanya tahap sinkronisasi server.
const READ_PHASE_PROGRESS = 60;
const READ_FAILED_MESSAGE =
    "File gagal dibaca. Pastikan file adalah laporan AHO .xlsx dari sistem IRIS Alfamart.";

export function ImportAhoTicketsDialog() {
```

- [ ] **Step 2: Tambah state tahap**

Ganti:

```tsx
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setResult(null);
        setIsTimeout(false);
        setProgress(0);
    }, []);
```

dengan:

```tsx
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<ImportPhase>("reading");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setResult(null);
        setIsTimeout(false);
        setProgress(0);
        setPhase("reading");
    }, []);
```

- [ ] **Step 3: Ganti `handleImport`**

Ganti seluruh fungsi `handleImport` (dari `function handleImport() {` sampai penutup `}` sebelum `return (`) dengan:

```tsx
    function showLocalFailure(message: string) {
        setResult({
            success: false,
            created: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            total: 0,
            printDate: null,
            errors: [message],
            duplicates: [],
        });
        toast.error("Import tiket AHO gagal", { description: message });
    }

    function handleImport() {
        if (!selectedFile) return;
        const file = selectedFile;

        setProgress(0);
        setPhase("reading");

        startTransition(async () => {
            // ── Tahap 1: baca XLSX di browser (0–60%, progress nyata) ──
            let parsed: ParseAhoXlsxResult;
            try {
                const data = new Uint8Array(await file.arrayBuffer());
                parsed = await parseAhoXlsx(data, {
                    onProgress: (fraction) => setProgress(fraction * READ_PHASE_PROGRESS),
                });
            } catch (error) {
                console.error("Failed to read AHO xlsx", error);
                parsed = { ok: false, error: READ_FAILED_MESSAGE };
            }

            if (!parsed.ok) {
                showLocalFailure(parsed.error);
                setProgress(100);
                return;
            }

            // ── Tahap 2: kirim baris ringkas ke server (60–98%, estimasi) ──
            setPhase("syncing");
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 98) return 98;
                    const remaining = 98 - prev;
                    const step =
                        prev < 80
                            ? Math.max(2, remaining * 0.2)
                            : Math.max(0.4, remaining * 0.08);
                    return Math.min(98, prev + step);
                });
            }, 250);

            try {
                const importResult = await adminImportAhoTickets(parsed.payload);
                setResult(importResult);

                if (importResult.success && importResult.errors.length === 0) {
                    toast.success("Import tiket AHO berhasil", {
                        description: `${importResult.created} tiket tersimpan dari ${importResult.total} baris.`,
                    });
                } else if (importResult.success) {
                    toast.warning("Import selesai dengan catatan", {
                        description: `${importResult.skipped} baris dilewati. Lihat detail di panel hasil.`,
                    });
                } else {
                    toast.error("Import tiket AHO gagal", {
                        description: importResult.errors[0] ?? "Terjadi kendala saat import.",
                    });
                }
            } catch {
                // Request ke server terputus (mis. timeout proxy) — server mungkin masih memproses.
                setIsTimeout(true);
            } finally {
                clearInterval(progressInterval);
                setProgress(100);
            }
        });
    }
```

- [ ] **Step 4: Label progress sesuai tahap**

Ganti:

```tsx
                                <span className="text-muted-foreground">
                                    Mensinkronisasi data...
                                </span>
```

dengan:

```tsx
                                <span className="text-muted-foreground">
                                    {phase === "reading" ? "Membaca file..." : "Mensinkronisasi data..."}
                                </span>
```

- [ ] **Step 5: Type check dan lint**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "aho-tickets|aho-import"`
Expected: tidak ada output.

Run: `npx eslint app/dashboard/aho-tickets lib/aho-import scripts/smoke-aho-xlsx-parse.ts`
Expected: tidak ada error.

- [ ] **Step 6: Jangan commit**

Biarkan semua perubahan unstaged.

---

### Task 5: Verifikasi end-to-end dan task note

**Files:**
- Create: `docs/agent-notes/2026-10-26-HHMM-aho-import-streaming-parse.md` (`HHMM` = jam WIB saat menulis)

**Interfaces:**
- Consumes: hasil Task 1–4
- Produces: tidak ada

- [ ] **Step 1: Jalankan ulang semua test terkait**

Run:
```
npx tsx lib/aho-import/import-payload.spec.ts
npx tsx lib/aho-import/parse-aho-xlsx.spec.ts
```
Expected: kedua baris `... all assertions passed`.

- [ ] **Step 2: Build produksi**

Run: `npm run build`
Expected: build sukses (memastikan `fflate` ter-bundle di client component tanpa masalah). Jika gagal karena memori, gunakan `npm run build:memory`.

- [ ] **Step 3: Cek target database sebelum uji manual**

Import menimpa isi tabel `MasterAhoTicket` (tiket yang tidak ada di file akan **dihapus**). Cek host di `DATABASE_URL` pada `.env` (jangan tampilkan password). Jika mengarah ke database produksi, **berhenti dan minta konfirmasi user** sebelum Step 4.

- [ ] **Step 4: Uji manual di browser**

1. `npm run dev` lalu buka `http://localhost:3001/dashboard/aho-tickets` sebagai ADMIN.
2. Klik **Import XLSX**, pilih `D:\Rendi Elang\Documents\rep_problem_20261026091033.xlsx`, klik **Mulai Import**.
3. Expected:
   - Label "Membaca file..." dengan progress naik bertahap sampai ~60% (sekitar 20–30 detik), UI tetap responsif (dialog bisa di-scroll, tidak "Page Unresponsive").
   - Label berganti "Mensinkronisasi data...", lalu panel **Sinkronisasi Selesai**.
   - "Dilewati" ≥ 235.530 (status selain New/Progress + kode toko yang tidak terdaftar).
   - Tabel menampilkan tiket; info Tanggal Cetak terakhir di halaman (setting `aho_last_print_date`) menunjukkan 26 Okt 2026 09:08 WIB.
4. Uji file salah: pilih file `.xlsx` lain yang bukan laporan IRIS → panel **Sinkronisasi Gagal** dengan pesan "Format file tidak dikenali…", tanpa request ke server.

- [ ] **Step 5: Tulis task note**

Buat `docs/agent-notes/2026-10-26-HHMM-aho-import-streaming-parse.md`:

```markdown
# AHO import: parse XLSX streaming di browser

## Scope

Memperbaiki import XLSX tiket AHO yang gagal ("Gagal melakukan sinkronisasi
(Kesalahan server)") untuk ekspor IRIS besar. Parsing dipindah ke browser
dengan unzip streaming; server action hanya menerima baris New/Progress.
Di luar cakupan: route `/api/admin/import-aho` dan `lib/jobs/aho-import*`
(tidak dipakai dialog, tidak diubah), logika sinkronisasi DB.

## Context and Sources

- `app/dashboard/aho-tickets/actions.ts`, `import-aho-tickets-dialog.tsx`
- `docs/superpowers/plans/2026-10-26-aho-import-streaming-parse.md`
- Catatan AHO import sebelumnya: 2026-08-21/22/23 di `docs/agent-notes/`

## Changed Files

- `lib/aho-import/import-payload.ts`: skema Zod + `normalizeAhoStatus` (dipakai client & server).
- `lib/aho-import/parse-aho-xlsx.ts`: parser streaming (fflate + scanner XML per `<row>`).
- `lib/aho-import/*.spec.ts`: test fixture (inline string, shared strings, chunk kecil, error).
- `scripts/smoke-aho-xlsx-parse.ts` + script `smoke:aho-xlsx`: smoke test ke file IRIS asli.
- `app/dashboard/aho-tickets/actions.ts`: hapus parser SheetJS; `adminImportAhoTickets(input: unknown)` memvalidasi payload.
- `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`: parse di browser, progress dua tahap.
- `package.json`, `package-lock.json`: dependensi `fflate`.

## Decisions

- Akar masalah: sheet XML ekspor IRIS 26 Okt 2026 = 565.192.737 karakter, di atas
  batas string V8 (536.870.888). SheetJS 0.18.5 menelan error dan mengembalikan
  `Sheets = {}`, lalu `ws["!ref"]` melempar TypeError.
- Parse di browser (bukan server/background job) agar payload kecil (~1,2 MB untuk
  ~10,6k baris aktif), tidak menyentuh batas `bodySizeLimit` 70 MB, dan tidak
  menambah beban memori/infra server.
- Dua pass unzip karena `sheet1.xml` berada sebelum `workbook.xml` di zip IRIS.
- Mendukung inline string (ekspor IRIS) dan shared strings (file disimpan ulang dari Excel).
- Tanggal Cetak diparse manual sebagai WIB agar konsisten antar browser.

## Verification

- `npx tsx lib/aho-import/import-payload.spec.ts` → passed
- `npx tsx lib/aho-import/parse-aho-xlsx.spec.ts` → passed
- `npm run smoke:aho-xlsx -- <file IRIS 26 Okt 2026>` → <isi hasil aktual: durasi, totalRows, activeRows>
- `npm run build` → <hasil>
- Uji manual dialog import → <hasil>

## Remaining Work and Risks

- `app/api/admin/import-aho/**` dan `lib/jobs/aho-import-worker.ts` masih memakai
  parser SheetJS lama dan akan gagal dengan file besar bila diaktifkan lagi.
- Parsing ~25 detik di browser untuk file 72 MB; akan bertambah seiring data YTD.
```

Isi bagian `<...>` di Verification dengan hasil aktual dari Step 1–4.

- [ ] **Step 6: Laporkan ke user, jangan commit**

Tampilkan `git status` dan ringkasan hasil verifikasi ke user. Jangan `git add` / `git commit` — tunggu perintah user.
