# PDF Checklist Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every PDF built by `generateReportPdf` (PJUM package, single report PDF, dev preview) renders checklist categories, items, material estimations, and completion details in catalog order (A1 → A22 → B1 → … → I13).

**Architecture:** A new pure module `lib/pdf/report-pdf-order.ts` sorts `items` and `estimations` with the existing catalog comparators from `lib/checklist-data.ts`. `generateReportPdf` calls it once while building `normalizedData`, so every downstream section reads already-sorted arrays. No caller changes.

**Tech Stack:** TypeScript, `@react-pdf/renderer`, Node `node:assert/strict` specs run with `npx tsx`.

**Spec:** `docs/superpowers/specs/2026-11-02-pdf-checklist-ordering-design.md`

## Global Constraints

- Work directly on `main`. Do not create a branch or worktree.
- Commit messages: Conventional Commits, no `Co-Authored-By` / "Generated with" lines.
- Do not change data stored in the database (JSONB `items` / `estimations`).
- Do not modify callers of `generateReportPdf` (`lib/pdf/generate-pjum-package-pdf.ts`, `lib/pdf/report-pdf-builder.ts`, `app/api/reports/preview-pdf/route.ts`).
- Sorting must be stable and must not mutate input arrays.
- Use the existing comparators `compareChecklistItemsById` and `compareChecklistItemIds` from `@/lib/checklist-data`; do not write a new comparator.

---

### Task 1: Pure ordering helper

**Files:**
- Create: `lib/pdf/report-pdf-order.ts`
- Test: `lib/pdf/report-pdf-order.spec.ts`

**Interfaces:**
- Consumes: `compareChecklistItemIds(a: string, b: string): number` and `compareChecklistItemsById<T extends { itemId: string }>(a: T, b: T): number` from `@/lib/checklist-data`; types `ReportItemJson`, `MaterialEstimationJson` from `@/types/report`.
- Produces: `orderReportPdfContent(data: { items: ReportItemJson[]; estimations: MaterialEstimationJson[] }): { items: ReportItemJson[]; estimations: MaterialEstimationJson[] }` — returns new sorted arrays.

- [ ] **Step 1: Write the failing test**

Create `lib/pdf/report-pdf-order.spec.ts`:

```ts
import assert from "node:assert/strict";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import { orderReportPdfContent } from "./report-pdf-order";

function item(itemId: string): ReportItemJson {
    return {
        itemId,
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
    };
}

function estimation(itemId: string, materialName: string): MaterialEstimationJson {
    return {
        itemId,
        materialName,
        quantity: 1,
        unit: "pcs",
        price: 1000,
        totalPrice: 1000,
    };
}

// 1. Items follow catalog order, with natural numbering (I2 before I11).
const items = ["G2", "E1", "A10", "A2", "G1", "I11", "I2"].map(item);
const estimations = [
    estimation("G2", "Besi hollow"),
    estimation("A2", "Semen"),
    estimation("G2", "Cat besi"),
    estimation("A10", "Bata ringan"),
    estimation("A2", "Pasir"),
];
const itemsBefore = items.map((i) => i.itemId);
const estimationsBefore = estimations.map((e) => e.materialName);

const ordered = orderReportPdfContent({ items, estimations });

assert.deepEqual(
    ordered.items.map((i) => i.itemId),
    ["A2", "A10", "E1", "G1", "G2", "I2", "I11"],
);

// 2. Estimations sorted by item; materials of the same item keep input order.
assert.deepEqual(
    ordered.estimations.map((e) => `${e.itemId}:${e.materialName}`),
    [
        "A2:Semen",
        "A2:Pasir",
        "A10:Bata ringan",
        "G2:Besi hollow",
        "G2:Cat besi",
    ],
);

// 3. Inputs are not mutated.
assert.deepEqual(
    items.map((i) => i.itemId),
    itemsBefore,
);
assert.deepEqual(
    estimations.map((e) => e.materialName),
    estimationsBefore,
);
assert.notEqual(ordered.items, items);
assert.notEqual(ordered.estimations, estimations);

// 4. Unknown item IDs go after catalog items.
const withUnknown = orderReportPdfContent({
    items: ["Z9", "B1", "A1"].map(item),
    estimations: [],
});
assert.deepEqual(
    withUnknown.items.map((i) => i.itemId),
    ["A1", "B1", "Z9"],
);

console.log("report-pdf-order tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/pdf/report-pdf-order.spec.ts`
Expected: FAIL — error resolving `./report-pdf-order` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `lib/pdf/report-pdf-order.ts`:

```ts
import {
    compareChecklistItemIds,
    compareChecklistItemsById,
} from "@/lib/checklist-data";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

/**
 * Urutkan item checklist dan estimasi material sesuai urutan katalog
 * (A1 → A22 → B1 → … → I13) agar semua bagian PDF laporan berurutan.
 * Sort stable: material pada item yang sama tetap sesuai urutan input BMS.
 * Tidak memutasi array input.
 */
export function orderReportPdfContent(data: {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
}): { items: ReportItemJson[]; estimations: MaterialEstimationJson[] } {
    return {
        items: [...data.items].sort(compareChecklistItemsById),
        estimations: [...data.estimations].sort((a, b) =>
            compareChecklistItemIds(a.itemId, b.itemId),
        ),
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/pdf/report-pdf-order.spec.ts`
Expected: prints `report-pdf-order tests passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/report-pdf-order.ts lib/pdf/report-pdf-order.spec.ts
git commit -m "feat(pdf): add catalog ordering helper for report pdf"
```

---

### Task 2: Use the helper in `generateReportPdf` and verify visually

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts` (imports near line 23; `generateReportPdf` body at ~line 2636–2662)
- Modify: `app/api/preview-pdf/route.ts` (mock `items` / `estimations` in `buildMockData`, ~lines 99–175) — dev-only route, reorder mock data so the preview proves sorting

**Interfaces:**
- Consumes: `orderReportPdfContent` from `@/lib/pdf/report-pdf-order` (Task 1).
- Produces: no new exports. `generateReportPdf(data: ReportPdfData): Promise<Buffer>` keeps its signature.

- [ ] **Step 1: Import the helper**

In `lib/pdf/generate-report-pdf.ts`, directly below the existing line

```ts
import { getChecklistItemMeta } from "@/lib/checklist-data";
```

add:

```ts
import { orderReportPdfContent } from "@/lib/pdf/report-pdf-order";
```

- [ ] **Step 2: Sort inside `normalizedData`**

In `generateReportPdf`, replace the start of the function:

```ts
export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
    const normalizedData: ReportPdfData = {
        ...data,
```

with:

```ts
export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
    const ordered = orderReportPdfContent(data);
    const normalizedData: ReportPdfData = {
        ...data,
        estimations: ordered.estimations,
```

and in the same object literal replace

```ts
        items: data.items.map((item) => ({
```

with

```ts
        items: ordered.items.map((item) => ({
```

Leave the rest of the function unchanged. `buildReportDocument(normalizedData, dimensionMap)` now receives sorted `items` and `estimations`, so the checklist table (`groupItemsByCategory` + two-column split), the estimation table, and "Detail Penyelesaian Pekerjaan" all render in catalog order.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p .`
Expected: no new errors in `lib/pdf/generate-report-pdf.ts` or `lib/pdf/report-pdf-order.ts`.

Run: `npx eslint lib/pdf/generate-report-pdf.ts lib/pdf/report-pdf-order.ts lib/pdf/report-pdf-order.spec.ts`
Expected: no errors.

- [ ] **Step 4: Reorder preview mock data out of catalog order**

In `app/api/preview-pdf/route.ts` `buildMockData`, reorder the `items` array so the `B1` object comes first, then `A2`, then `A1` (move the whole object literals; do not change their contents). Reorder `estimations` so the `B1` estimation comes before the `A1` estimation. Add one comment line above `items: [`:

```ts
        // Sengaja tidak urut: PDF harus tetap menampilkan A1, A2, B1.
```

- [ ] **Step 5: Re-run existing PDF specs**

Run: `npx tsx lib/pdf/report-pdf-order.spec.ts`
Expected: `report-pdf-order tests passed`

Run: `npx tsx lib/pdf/generate-report-pdf-gallery.spec.ts`
Expected: `generate-report-pdf gallery tests passed`

- [ ] **Step 6: Visual check in the browser**

Start the dev server with `preview_start` (create `.claude/launch.json` entry `npm run dev`, port 3000 if missing). Open `http://localhost:3000/api/preview-pdf?mode=completed`.

Confirm in the rendered PDF:
- Checklist table: category "A. Bagian Depan Bangunan" with A1 then A2, followed by "B. Area Sales" with B1.
- Estimation table: row 1 = A1 (Engsel Lantai Dorma), row 2 = B1 (Starter Lampu TL).
- "Detail Penyelesaian Pekerjaan": only B1 has handler BMS in the mock, so one block (B1) — confirm it renders without error.

Also open `http://localhost:3000/api/preview-pdf?mode=pending` and confirm it renders (HTTP 200, PDF content type).

If the PDF viewer cannot be read via page text, take a screenshot as proof.

- [ ] **Step 7: Commit**

```bash
git add lib/pdf/generate-report-pdf.ts app/api/preview-pdf/route.ts
git commit -m "fix(pdf): render report checklist in catalog order"
```
