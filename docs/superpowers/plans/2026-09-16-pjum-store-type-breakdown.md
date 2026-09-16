# PJUM Store Type Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PJUM recap breakdown tables by store type while preserving the current single recap layout for homogeneous PJUM exports.

**Architecture:** Keep the existing PJUM package flow: `generatePjumPackagePdf()` queries reports and builds recap rows, then `generatePjumPdf()` renders the first recap document. Add a focused categorization helper that maps report store metadata into display groups, enrich recap rows with `Store.brand` and `Store.ownershipType`, and let React PDF render the combined table, signature, then optional breakdown content in natural document order.

**Tech Stack:** Next.js App Router server actions, Prisma, React PDF `@react-pdf/renderer`, `pdf-lib`, TypeScript, `node:test` focused specs.

## Global Constraints

- Preserve the current PJUM package order: recap PDF, PJUM form, then individual report PDFs.
- Preserve the current combined recap table and signature layout for PJUM exports containing only one store category.
- Render breakdown content only when selected PJUM reports span more than one store category.
- Breakdown starts after the `DIBUAT OLEH` and `DISETUJUI OLEH` signature section, using remaining page space first and flowing to later pages only when content does not fit.
- For mixed PJUM exports, title the first table clearly as the combined recap, then render per-category breakdown tables below the signature.
- Categories are `Alfamart Reguler`, `Alfamart Franchise`, `Lawson`, and `Alfamart - Tipe Toko Belum Diketahui`.
- Do not silently classify Alfamart `UNKNOWN` as regular in PJUM breakdown output.
- Reports with missing store relation, missing brand, or unrecognized brand are treated as `Alfamart - Tipe Toko Belum Diketahui`.
- Do not add a database migration; `Store.brand` and `Store.ownershipType` already exist.
- Update canonical workflow/database documentation and create a dated task note before finishing implementation.

---

## File Structure

- Create `lib/pdf/pjum-store-type-breakdown.ts`: pure helper for mapping recap rows into ordered PJUM store type groups.
- Create `lib/pdf/pjum-store-type-breakdown.spec.ts`: unit coverage for category mapping, single-category suppression, mixed-category grouping, totals, and unknown handling.
- Modify `lib/pdf/generate-pjum-package-pdf.ts`: select report `store.brand` and `store.ownershipType`, then pass those values into recap rows.
- Modify `lib/pdf/generate-pjum-package-pdf.spec.ts`: source-level regression checks that the package query and row mapping include store type metadata.
- Modify `lib/pdf/generate-pjum-pdf.ts`: extend `PjumPdfRow`, render optional combined title, keep signature before breakdown, and render per-category breakdown sections only for mixed categories.
- Modify `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`: source-level regression checks for renderer contract and order.
- Modify `docs/project/04-workflows.md`: document PJUM PDF store type breakdown behavior.
- Modify `docs/project/06-database.md`: document how PJUM classifies `Store.brand` and `Store.ownershipType`.
- Create `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-store-type-breakdown.md`: implementation task note.

---

### Task 1: PJUM Store Type Grouping Helper

**Files:**
- Create: `lib/pdf/pjum-store-type-breakdown.ts`
- Test: `lib/pdf/pjum-store-type-breakdown.spec.ts`

**Interfaces:**
- Consumes: `brand?: string | null`, `ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null`, `totalRealisasi: number`.
- Produces: `getPjumStoreTypeBreakdown(rows: PjumBreakdownInputRow[]): PjumStoreTypeBreakdown`, where `shouldRenderBreakdown` is `true` only when more than one category has rows.

- [ ] **Step 1: Write the failing helper test**

Create `lib/pdf/pjum-store-type-breakdown.spec.ts`:

```ts
import test from "node:test";
import * as assert from "node:assert";
import {
    getPjumStoreTypeBreakdown,
    resolvePjumStoreTypeCategory,
} from "./pjum-store-type-breakdown";

test("resolvePjumStoreTypeCategory maps known brands and ownership values", () => {
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "ALFAMART",
            ownershipType: "REGULAR",
        }).label,
        "Alfamart Reguler",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "alfamart",
            ownershipType: "FRANCHISE",
        }).label,
        "Alfamart Franchise",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "LAWSON",
            ownershipType: "REGULAR",
        }).label,
        "Lawson",
    );
});

test("resolvePjumStoreTypeCategory keeps Alfamart unknown explicit", () => {
    const category = resolvePjumStoreTypeCategory({
        brand: "ALFAMART",
        ownershipType: "UNKNOWN",
    });

    assert.strictEqual(category.key, "ALFAMART_UNKNOWN");
    assert.strictEqual(category.label, "Alfamart - Tipe Toko Belum Diketahui");
});

test("resolvePjumStoreTypeCategory treats missing or unrecognized store metadata as unknown Alfamart", () => {
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: null,
            ownershipType: null,
        }).key,
        "ALFAMART_UNKNOWN",
    );
    assert.strictEqual(
        resolvePjumStoreTypeCategory({
            brand: "OTHER",
            ownershipType: "REGULAR",
        }).key,
        "ALFAMART_UNKNOWN",
    );
});

test("getPjumStoreTypeBreakdown suppresses breakdown for one category", () => {
    const result = getPjumStoreTypeBreakdown([
        {
            reportNumber: "M001-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 100_000,
        },
        {
            reportNumber: "M002-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 50_000,
        },
    ]);

    assert.strictEqual(result.shouldRenderBreakdown, false);
    assert.strictEqual(result.groups.length, 1);
    assert.strictEqual(result.groups[0].subtotal, 150_000);
});

test("getPjumStoreTypeBreakdown orders and totals mixed categories", () => {
    const result = getPjumStoreTypeBreakdown([
        {
            reportNumber: "F001-2609-001",
            brand: "ALFAMART",
            ownershipType: "FRANCHISE",
            totalRealisasi: 25_000,
        },
        {
            reportNumber: "L001-2609-001",
            brand: "LAWSON",
            ownershipType: "REGULAR",
            totalRealisasi: 75_000,
        },
        {
            reportNumber: "R001-2609-001",
            brand: "ALFAMART",
            ownershipType: "REGULAR",
            totalRealisasi: 100_000,
        },
        {
            reportNumber: "U001-2609-001",
            brand: "ALFAMART",
            ownershipType: "UNKNOWN",
            totalRealisasi: 10_000,
        },
    ]);

    assert.strictEqual(result.shouldRenderBreakdown, true);
    assert.deepStrictEqual(
        result.groups.map((group) => group.label),
        [
            "Alfamart Reguler",
            "Alfamart Franchise",
            "Lawson",
            "Alfamart - Tipe Toko Belum Diketahui",
        ],
    );
    assert.deepStrictEqual(
        result.groups.map((group) => group.subtotal),
        [100_000, 25_000, 75_000, 10_000],
    );
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"
```

Expected: FAIL because `lib/pdf/pjum-store-type-breakdown.ts` does not exist.

- [ ] **Step 3: Implement the grouping helper**

Create `lib/pdf/pjum-store-type-breakdown.ts`:

```ts
export type PjumStoreTypeKey =
    | "ALFAMART_REGULAR"
    | "ALFAMART_FRANCHISE"
    | "LAWSON"
    | "ALFAMART_UNKNOWN";

export type PjumStoreTypeCategory = {
    key: PjumStoreTypeKey;
    label: string;
};

export type PjumBreakdownInputRow = {
    reportNumber: string;
    brand?: string | null;
    ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null;
    totalRealisasi: number;
};

export type PjumStoreTypeBreakdownGroup<T extends PjumBreakdownInputRow = PjumBreakdownInputRow> =
    PjumStoreTypeCategory & {
        rows: T[];
        subtotal: number;
    };

export type PjumStoreTypeBreakdown<T extends PjumBreakdownInputRow = PjumBreakdownInputRow> = {
    shouldRenderBreakdown: boolean;
    groups: PjumStoreTypeBreakdownGroup<T>[];
};

const CATEGORY_ORDER: PjumStoreTypeCategory[] = [
    { key: "ALFAMART_REGULAR", label: "Alfamart Reguler" },
    { key: "ALFAMART_FRANCHISE", label: "Alfamart Franchise" },
    { key: "LAWSON", label: "Lawson" },
    {
        key: "ALFAMART_UNKNOWN",
        label: "Alfamart - Tipe Toko Belum Diketahui",
    },
];

const CATEGORY_BY_KEY = new Map(
    CATEGORY_ORDER.map((category) => [category.key, category]),
);

function normalizeBrandKey(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    if (normalized === "LAWSON") return "LAWSON";
    if (normalized === "ALFAMART") return "ALFAMART";
    return "ALFAMART";
}

export function resolvePjumStoreTypeCategory(row: {
    brand?: string | null;
    ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null;
}): PjumStoreTypeCategory {
    const brandKey = normalizeBrandKey(row.brand);

    if (brandKey === "LAWSON") {
        return CATEGORY_BY_KEY.get("LAWSON")!;
    }

    if (row.ownershipType === "REGULAR") {
        return CATEGORY_BY_KEY.get("ALFAMART_REGULAR")!;
    }

    if (row.ownershipType === "FRANCHISE") {
        return CATEGORY_BY_KEY.get("ALFAMART_FRANCHISE")!;
    }

    return CATEGORY_BY_KEY.get("ALFAMART_UNKNOWN")!;
}

export function getPjumStoreTypeBreakdown<T extends PjumBreakdownInputRow>(
    rows: T[],
): PjumStoreTypeBreakdown<T> {
    const grouped = new Map<PjumStoreTypeKey, PjumStoreTypeBreakdownGroup<T>>();

    for (const row of rows) {
        const category = resolvePjumStoreTypeCategory(row);
        const existing =
            grouped.get(category.key) ??
            ({
                ...category,
                rows: [],
                subtotal: 0,
            } satisfies PjumStoreTypeBreakdownGroup<T>);

        existing.rows.push(row);
        existing.subtotal += row.totalRealisasi;
        grouped.set(category.key, existing);
    }

    const groups = CATEGORY_ORDER.flatMap((category) => {
        const group = grouped.get(category.key);
        return group ? [group] : [];
    });

    return {
        shouldRenderBreakdown: groups.length > 1,
        groups,
    };
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/pdf/pjum-store-type-breakdown.ts lib/pdf/pjum-store-type-breakdown.spec.ts
git commit -m "feat(pjum): add store type grouping"
```

---

### Task 2: Enrich PJUM Recap Rows With Store Metadata

**Files:**
- Modify: `lib/pdf/generate-pjum-package-pdf.ts`
- Create: `lib/pdf/generate-pjum-package-pdf.spec.ts`

**Interfaces:**
- Consumes: `Report.store` relation selecting `brand` and `ownershipType`.
- Produces: `recapRows` entries with `brand` and `ownershipType` passed into `generatePjumPdf()`.

- [ ] **Step 1: Write the failing source-level package test**

Create `lib/pdf/generate-pjum-package-pdf.spec.ts`:

```ts
import test from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/pdf/generate-pjum-package-pdf.ts", "utf8");

test("PJUM package query selects store metadata for recap breakdown", () => {
    assert.match(source, /store:\s*\{\s*select:\s*\{\s*brand:\s*true,\s*ownershipType:\s*true\s*\}\s*\}/s);
});

test("PJUM recap rows include brand and ownership type", () => {
    assert.match(source, /brand:\s*r\.store\?\.brand\s*\?\?\s*null/);
    assert.match(source, /ownershipType:\s*r\.store\?\.ownershipType\s*\?\?\s*null/);
});
```

- [ ] **Step 2: Run the package test to verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"
```

Expected: FAIL because the first package query does not select `store.brand` or `store.ownershipType`.

- [ ] **Step 3: Enrich the first PJUM package report query**

In `lib/pdf/generate-pjum-package-pdf.ts`, inside the first `prisma.report.findMany()` `select`, add:

```ts
            store: { select: { brand: true, ownershipType: true } },
```

In the `recapRows` mapper, add:

```ts
            brand: r.store?.brand ?? null,
            ownershipType: r.store?.ownershipType ?? null,
```

- [ ] **Step 4: Run the package test**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/pdf/generate-pjum-package-pdf.ts lib/pdf/generate-pjum-package-pdf.spec.ts
git commit -m "feat(pjum): include store type metadata"
```

---

### Task 3: Render Breakdown After Signature

**Files:**
- Modify: `lib/pdf/generate-pjum-pdf.ts`
- Create: `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`

**Interfaces:**
- Consumes: `PjumPdfRow.brand`, `PjumPdfRow.ownershipType`, and `getPjumStoreTypeBreakdown(data.reports)`.
- Produces: optional breakdown sections rendered after `styles.stampSection`.

- [ ] **Step 1: Write the failing renderer source test**

Create `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`:

```ts
import test from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");

test("PjumPdfRow carries store type metadata", () => {
    assert.match(source, /brand\?: string \| null;/);
    assert.match(source, /ownershipType\?: "REGULAR" \| "FRANCHISE" \| "UNKNOWN" \| null;/);
});

test("PJUM renderer uses store type breakdown helper", () => {
    assert.match(source, /getPjumStoreTypeBreakdown\(data\.reports\)/);
    assert.match(source, /breakdown\.shouldRenderBreakdown/);
});

test("combined recap title appears only for mixed category breakdowns", () => {
    assert.match(source, /Rekap Gabungan Semua Tipe Toko/);
});

test("breakdown is rendered after signature section", () => {
    const stampIndex = source.indexOf("styles.stampSection");
    const breakdownIndex = source.indexOf("styles.breakdownSection");

    assert.ok(stampIndex > -1, "signature section must exist");
    assert.ok(breakdownIndex > -1, "breakdown section must exist");
    assert.ok(
        breakdownIndex > stampIndex,
        "breakdown section should be rendered after signature section",
    );
});
```

- [ ] **Step 2: Run the renderer test to verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-pdf-breakdown.spec.ts"
```

Expected: FAIL because `PjumPdfRow` does not expose store metadata and the breakdown renderer does not exist.

- [ ] **Step 3: Import the helper and extend row type**

At the top of `lib/pdf/generate-pjum-pdf.ts`, add:

```ts
import { getPjumStoreTypeBreakdown } from "@/lib/pdf/pjum-store-type-breakdown";
```

Extend `PjumPdfRow`:

```ts
    brand?: string | null;
    ownershipType?: "REGULAR" | "FRANCHISE" | "UNKNOWN" | null;
```

- [ ] **Step 4: Add breakdown styles**

Inside `StyleSheet.create()`, add:

```ts
    combinedTitle: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#374151",
        marginBottom: 5,
    },
    breakdownSection: {
        marginTop: 16,
    },
    breakdownTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#0069a7",
        marginBottom: 8,
        textAlign: "center",
    },
    breakdownGroup: {
        marginBottom: 12,
    },
    breakdownGroupTitle: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: "#111827",
        marginBottom: 4,
    },
    breakdownSubtotalRow: {
        flexDirection: "row",
        borderTop: "1px solid #0069a7",
        paddingTop: 4,
        marginTop: 2,
    },
    breakdownSubtotalLabel: {
        flex: 1,
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        textAlign: "right",
        paddingRight: 6,
    },
    breakdownSubtotalValue: {
        width: 80,
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#0069a7",
        textAlign: "right",
    },
```

- [ ] **Step 5: Compute breakdown state**

Inside `buildPjumDocument()`, after `showBnmStamp`, add:

```ts
    const breakdown = getPjumStoreTypeBreakdown(data.reports);
```

- [ ] **Step 6: Render a combined title above the main table only for mixed categories**

Immediately before the main table header `React.createElement(View, { style: styles.tableHeader }, ...)`, insert:

```ts
            breakdown.shouldRenderBreakdown
                ? React.createElement(
                      Text,
                      { style: styles.combinedTitle },
                      "Rekap Gabungan Semua Tipe Toko",
                  )
                : null,
```

- [ ] **Step 7: Add local row renderer helpers**

Inside `buildPjumDocument()`, after `tableRows`, add:

```ts
    const renderTableHeader = (key: string) =>
        React.createElement(
            View,
            { key, style: styles.tableHeader },
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colNo } }, "No"),
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colDate } }, "Tanggal"),
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colReportNumber } }, "No. Laporan"),
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colStoreCode } }, "Kode Toko"),
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colStoreName } }, "Nama Toko"),
            React.createElement(Text, { style: { ...styles.thCell, ...styles.colTotal } }, "Total Realisasi"),
        );

    const renderTableRow = (r: PjumPdfRow, i: number) =>
        React.createElement(
            View,
            {
                key: r.reportNumber,
                style:
                    i % 2 === 1
                        ? { ...styles.tableRow, ...styles.tableRowAlt }
                        : styles.tableRow,
            },
            React.createElement(Text, { style: { ...styles.tdCell, ...styles.colNo } }, String(i + 1)),
            React.createElement(Text, { style: { ...styles.tdCell, ...styles.colDate } }, fmtDate(r.createdAt)),
            React.createElement(Text, { style: { ...styles.tdCell, ...styles.colReportNumber } }, r.reportNumber),
            React.createElement(Text, { style: { ...styles.tdCell, ...styles.colStoreCode } }, r.storeCode || "-"),
            React.createElement(
                Text,
                {
                    style: {
                        ...styles.tdCell,
                        ...styles.colStoreName,
                        fontFamily: "Helvetica-Bold",
                    },
                },
                r.storeName || "-",
            ),
            React.createElement(
                Text,
                { style: { ...styles.tdCell, ...styles.colTotal } },
                r.totalRealisasi > 0 ? fmtCurrency(r.totalRealisasi) : "-",
            ),
        );
```

Then replace the current `tableRows` mapper body with:

```ts
    const tableRows = data.reports.map((r, i) => renderTableRow(r, i));
```

Replace the manually duplicated main table header with:

```ts
            renderTableHeader("combined-table-header"),
```

- [ ] **Step 8: Render breakdown after the signature section**

Immediately after the signature `React.createElement(View, { style: styles.stampSection }, ...)` block and before the footer block, add:

```ts
            breakdown.shouldRenderBreakdown
                ? React.createElement(
                      View,
                      { style: styles.breakdownSection },
                      React.createElement(
                          Text,
                          { style: styles.breakdownTitle },
                          "RINCIAN REKAPAN BERDASARKAN TIPE TOKO",
                      ),
                      ...breakdown.groups.map((group) =>
                          React.createElement(
                              View,
                              { key: group.key, style: styles.breakdownGroup },
                              React.createElement(
                                  Text,
                                  { style: styles.breakdownGroupTitle },
                                  group.label,
                              ),
                              renderTableHeader(`${group.key}-header`),
                              ...group.rows.map((row, index) =>
                                  renderTableRow(row, index),
                              ),
                              React.createElement(
                                  View,
                                  { style: styles.breakdownSubtotalRow },
                                  React.createElement(
                                      Text,
                                      { style: styles.breakdownSubtotalLabel },
                                      `SUBTOTAL ${group.label.toUpperCase()}`,
                                  ),
                                  React.createElement(
                                      Text,
                                      { style: styles.breakdownSubtotalValue },
                                      fmtCurrency(group.subtotal),
                                  ),
                              ),
                          ),
                      ),
                  )
                : null,
```

- [ ] **Step 9: Run helper, package, and renderer tests**

Run:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-pdf-breakdown.spec.ts"
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```powershell
git add lib/pdf/generate-pjum-pdf.ts lib/pdf/generate-pjum-pdf-breakdown.spec.ts
git commit -m "feat(pjum): render store type breakdown"
```

---

### Task 4: PDF Smoke Fixture

**Files:**
- Modify: `scripts/test-pjum-form.ts` or create `scripts/test-pjum-recap-breakdown.ts`

**Interfaces:**
- Consumes: `generatePjumPdf()` with mixed `PjumPdfRow` metadata.
- Produces: a local smoke PDF buffer proving React PDF can render the mixed-category recap without throwing.

- [ ] **Step 1: Create a focused smoke script**

Create `scripts/test-pjum-recap-breakdown.ts`:

```ts
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { generatePjumPdf } from "../lib/pdf/generate-pjum-pdf";

async function main() {
    const buffer = await generatePjumPdf({
        bmsName: "ROKHMAN",
        bmsNIK: "13097743",
        bmcName: "PANJI HANDOKO",
        bmcNIK: "09070120",
        bnmName: "YUDI PURWA NUGRAHA",
        bnmNIK: "09040998",
        approvedAt: "2026-09-16T03:00:00.000Z",
        branchName: "MALANG",
        from: "2026-09-10T00:00:00.000Z",
        to: "2026-09-16T00:00:00.000Z",
        weekNumber: 2,
        exportedAt: "2026-09-16T03:00:00.000Z",
        reports: [
            {
                reportNumber: "M1H3-2609-002",
                createdAt: "2026-09-11T00:00:00.000Z",
                storeName: "BENDUNGAN SELRJO MLG",
                storeCode: "M1H3",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 361_500,
                brand: "ALFAMART",
                ownershipType: "REGULAR",
            },
            {
                reportNumber: "M920-2609-001",
                createdAt: "2026-09-16T00:00:00.000Z",
                storeName: "KH AGUS SALIM BATU",
                storeCode: "M920",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 85_000,
                brand: "ALFAMART",
                ownershipType: "FRANCHISE",
            },
            {
                reportNumber: "L001-2609-001",
                createdAt: "2026-09-16T00:00:00.000Z",
                storeName: "LAWSON MALANG",
                storeCode: "L001",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 55_000,
                brand: "LAWSON",
                ownershipType: "REGULAR",
            },
        ],
    });

    const outputDir = path.join(process.cwd(), "scratch");
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "pjum-recap-breakdown-smoke.pdf");
    writeFileSync(outputPath, buffer);
    console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

- [ ] **Step 2: Run the smoke script**

Run:

```powershell
node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"
```

Expected: PASS and prints `Wrote ...scratch\pjum-recap-breakdown-smoke.pdf`.

- [ ] **Step 3: Commit**

```powershell
git add scripts/test-pjum-recap-breakdown.ts
git commit -m "test(pjum): add breakdown PDF smoke"
```

---

### Task 5: Documentation and Task Note

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/06-database.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-store-type-breakdown.md`

**Interfaces:**
- Consumes: implemented PJUM recap behavior from Tasks 1-4.
- Produces: canonical documentation and required dated task note.

- [ ] **Step 1: Update workflow docs**

In `docs/project/04-workflows.md`, after the PJUM cost rules, add:

```md
PDF recap PJUM:

- Halaman recap utama tetap menampilkan table gabungan semua laporan dan total gabungan.
- Jika semua laporan berasal dari satu kategori tipe toko, recap tetap satu table seperti format sebelumnya.
- Jika laporan mencakup lebih dari satu kategori, table utama diberi konteks sebagai rekap gabungan dan rincian berdasarkan tipe toko ditampilkan setelah section tanda tangan `Dibuat Oleh` / `Disetujui Oleh`.
- Breakdown dimulai di sisa ruang halaman yang sama; jika tidak muat, renderer PDF melanjutkan ke halaman berikutnya.
- Kategori breakdown: Alfamart Reguler, Alfamart Franchise, Lawson, dan Alfamart - Tipe Toko Belum Diketahui.
```

- [ ] **Step 2: Update database docs**

In `docs/project/06-database.md`, inside the `Report dan PJUM` section, add:

```md
Recap PDF PJUM memakai `Report.storeCode -> Store.code` untuk membaca
`Store.brand` dan `Store.ownershipType`. Lawson ditentukan dari
`Store.brand = LAWSON`. Alfamart regular/franchise ditentukan dari
`Store.ownershipType`. Alfamart `UNKNOWN`, store relation yang tidak ditemukan,
brand kosong, atau brand tidak dikenal ditampilkan sebagai
`Alfamart - Tipe Toko Belum Diketahui`; sistem tidak menebak nilai itu sebagai
regular.
```

- [ ] **Step 3: Create the task note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-store-type-breakdown.md` using the current Asia/Jakarta timestamp:

```md
# PJUM Store Type Breakdown

## Scope

Add optional PJUM recap breakdown tables by store type after the `Dibuat Oleh` / `Disetujui Oleh` section. Outside scope: changing PJUM approval workflow, database schema, Google Drive upload behavior, and store enrichment sync rules.

## Context and Sources

- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `docs/superpowers/plans/2026-09-16-pjum-store-type-breakdown.md`
- `lib/pdf/generate-pjum-package-pdf.ts`
- `lib/pdf/generate-pjum-pdf.ts`
- `lib/store-ownership.ts`
- `prisma/schema.prisma`

## Changed Files

- `lib/pdf/pjum-store-type-breakdown.ts`: added pure PJUM store type grouping helper.
- `lib/pdf/pjum-store-type-breakdown.spec.ts`: added helper coverage for known and unknown categories.
- `lib/pdf/generate-pjum-package-pdf.ts`: passed store brand and ownership metadata into recap rows.
- `lib/pdf/generate-pjum-package-pdf.spec.ts`: added source-level query and row mapping checks.
- `lib/pdf/generate-pjum-pdf.ts`: rendered optional combined title and breakdown tables after the signature section.
- `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`: added source-level renderer order checks.
- `scripts/test-pjum-recap-breakdown.ts`: added React PDF smoke fixture.
- `docs/project/04-workflows.md`: documented PJUM recap breakdown behavior.
- `docs/project/06-database.md`: documented PJUM store type classification.

## Decisions

- Single-category PJUM exports keep the current one-table recap format.
- Mixed-category PJUM exports show a combined table first, then breakdown sections after signatures.
- Alfamart `UNKNOWN` remains explicit as `Alfamart - Tipe Toko Belum Diketahui`.
- Missing or unrecognized store metadata is treated as unknown Alfamart for display instead of being guessed as regular.

## Verification

- `node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"` passed.
- `node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"` passed.
- `node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-pdf-breakdown.spec.ts"` passed.
- `node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"` passed and wrote `scratch\pjum-recap-breakdown-smoke.pdf`.
- `node_modules\.bin\tsc.cmd --noEmit --incremental false` passed.

## Remaining Work and Risks

- Manual visual review of `scratch\pjum-recap-breakdown-smoke.pdf` is recommended before production deployment.
```

- [ ] **Step 4: Commit docs and task note**

```powershell
git add docs/project/04-workflows.md docs/project/06-database.md docs/agent-notes/*-pjum-store-type-breakdown.md
git commit -m "docs: record PJUM store type breakdown"
```

---

### Task 6: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all implemented tasks.
- Produces: evidence that focused tests, smoke PDF generation, TypeScript, and git status are clean.

- [ ] **Step 1: Run focused tests**

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"
node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-pdf-breakdown.spec.ts"
```

Expected: all commands PASS.

- [ ] **Step 2: Run PDF smoke**

```powershell
node_modules\.bin\tsx.cmd "scripts/test-pjum-recap-breakdown.ts"
```

Expected: exits with code 0 and writes `scratch\pjum-recap-breakdown-smoke.pdf`.

- [ ] **Step 3: Run TypeScript**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false
```

Expected: exits with code 0. If unrelated existing type errors appear, record the exact errors and do not hide them.

- [ ] **Step 4: Inspect git status**

```powershell
git status --short --branch
```

Expected: clean working tree on the implementation branch after commits.

