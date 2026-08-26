# Preventive Annual Matrix Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new filtered XLSX export for the admin Checklist Preventif `Matriks Tahunan` tab without changing the existing dashboard matrix behavior or existing header export.

**Architecture:** Add a focused server-side data module that mirrors the current dashboard's preventive matrix semantics and includes `totalReal`. Add a dedicated API route that turns that shaped data into a two-sheet XLSX workbook. Add a separate client dialog/button inside the annual matrix tab that calls the new route.

**Tech Stack:** Next.js App Router, React client components, Prisma, PostgreSQL raw SQL through Prisma, `xlsx`, shadcn/ui, `sonner`, Node assert spec files.

## Global Constraints

- Do not change the current dashboard matrix logic.
- Do not change the existing top-level Export XLSX flow.
- Use the same current dashboard report-selection semantics: latest qualifying preventive report per store and quarter.
- Classify preventive reports with the existing `completePreventiveEvidenceSql` logic.
- The export dialog filters are Cabang, Brand, Tahun, Triwulan, and Status.
- The XLSX remains an annual matrix with Q1-Q4 visible; selected Triwulan is only for Status filtering and coverage metrics.
- Nominal values come from `Report.totalReal` on the same selected matrix report.
- `totalReal = null` exports blank; `totalReal = 0` exports numeric zero.
- Use existing shadcn/ui components and project patterns.
- If files or project decisions change, create a dated task note in `docs/agent-notes/`.

---

## File Structure

- Create `app/dashboard/preventive/annual-matrix-export.ts`: pure-ish data shaping helpers, public query function, row/summary types.
- Create `app/dashboard/preventive/annual-matrix-export.spec.ts`: node assert tests for latest-report selection, selected-quarter status filter, null/zero nominal handling, and branch totals.
- Create `app/api/dashboard/preventive/annual-matrix-export/route.ts`: authenticated POST endpoint that validates filters, calls the export query, builds XLSX, and returns an attachment.
- Create `app/dashboard/preventive/_components/export-preventive-matrix-dialog.tsx`: dedicated popup filter and download button for the matrix export.
- Modify `app/dashboard/preventive/_components/admin-preventive-table.tsx`: render the new matrix export dialog only near the `Matriks Tahunan` tab content.
- Create `docs/agent-notes/2026-08-25-2030-preventive-matrix-export.md`: implementation task note.

---

### Task 1: Matrix Export Data Module

**Files:**
- Create: `app/dashboard/preventive/annual-matrix-export.ts`
- Create: `app/dashboard/preventive/annual-matrix-export.spec.ts`

**Interfaces:**
- Consumes: `completePreventiveEvidenceSql`, `getJakartaYearWindow`, `getJakartaQuarterKey`, `getStoreBrandWhere`, `getAuthUser`, Prisma.
- Produces:

```ts
export type PreventiveMatrixExportStatus = "all" | "completed" | "pending";
export type PreventiveMatrixExportQuarter = 1 | 2 | 3 | 4;
export type PreventiveMatrixExportQuarterKey = "q1" | "q2" | "q3" | "q4";

export type PreventiveMatrixExportFilters = {
    branchName?: string;
    brand?: StoreBrandFilter;
    year: number;
    quarter: PreventiveMatrixExportQuarter;
    status: PreventiveMatrixExportStatus;
};

export type PreventiveMatrixQuarterCell = {
    doneAt: Date;
    bmsName: string;
    bmsNIK: string;
    totalReal: number | null;
};

export type PreventiveMatrixExportRow = {
    storeCode: string;
    storeName: string;
    branchName: string;
    q1: PreventiveMatrixQuarterCell | null;
    q2: PreventiveMatrixQuarterCell | null;
    q3: PreventiveMatrixQuarterCell | null;
    q4: PreventiveMatrixQuarterCell | null;
};

export type PreventiveMatrixBranchSummary = {
    branchName: string;
    totalStores: number;
    completed: number;
    pending: number;
    coverage: number;
    q1Total: number;
    q2Total: number;
    q3Total: number;
    q4Total: number;
    yearTotal: number;
};

export type PreventiveMatrixExportData = {
    rows: PreventiveMatrixExportRow[];
    branchSummaries: PreventiveMatrixBranchSummary[];
    grandTotal: PreventiveMatrixBranchSummary;
};

export function getPreventiveMatrixQuarterKey(
    quarter: PreventiveMatrixExportQuarter,
): PreventiveMatrixExportQuarterKey;

export function shapePreventiveMatrixExportData(input: {
    stores: Array<{ code: string; name: string; branchName: string }>;
    reports: Array<{
        reportNumber: string;
        storeCode: string | null;
        createdAt: Date;
        createdByNIK: string;
        createdByName: string | null;
        totalReal: number | null;
    }>;
    selectedQuarter: PreventiveMatrixExportQuarter;
    status: PreventiveMatrixExportStatus;
}): PreventiveMatrixExportData;

export async function getPreventiveMatrixExportData(
    filters: PreventiveMatrixExportFilters,
): Promise<PreventiveMatrixExportData>;
```

- [ ] **Step 1: Write the failing data-shaping spec**

Create `app/dashboard/preventive/annual-matrix-export.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    shapePreventiveMatrixExportData,
    type PreventiveMatrixExportRow,
} from "./annual-matrix-export";

const stores = [
    { code: "1A01", name: "JEND SUDIRMAN", branchName: "PEKANBARU" },
    { code: "1A02", name: "HR SOEBRANTAS", branchName: "PEKANBARU" },
    { code: "2B01", name: "ANTASARI", branchName: "LAMPUNG" },
];

const data = shapePreventiveMatrixExportData({
    stores,
    selectedQuarter: 3,
    status: "all",
    reports: [
        {
            reportNumber: "R-OLD",
            storeCode: "1A01",
            createdAt: new Date("2026-07-01T03:00:00.000Z"),
            createdByNIK: "BMS001",
            createdByName: "BMS Lama",
            totalReal: 12000,
        },
        {
            reportNumber: "R-NEW",
            storeCode: "1A01",
            createdAt: new Date("2026-07-15T03:00:00.000Z"),
            createdByNIK: "BMS002",
            createdByName: "BMS Baru",
            totalReal: 0,
        },
        {
            reportNumber: "R-Q2",
            storeCode: "1A02",
            createdAt: new Date("2026-05-02T03:00:00.000Z"),
            createdByNIK: "BMS003",
            createdByName: null,
            totalReal: null,
        },
    ],
});

const row1 = data.rows.find((row) => row.storeCode === "1A01") as PreventiveMatrixExportRow;
assert.equal(row1.q3?.bmsName, "BMS Baru");
assert.equal(row1.q3?.totalReal, 0);

const row2 = data.rows.find((row) => row.storeCode === "1A02") as PreventiveMatrixExportRow;
assert.equal(row2.q2?.bmsNIK, "BMS003");
assert.equal(row2.q2?.totalReal, null);
assert.equal(row2.q3, null);

const pendingQ3 = shapePreventiveMatrixExportData({
    stores,
    selectedQuarter: 3,
    status: "pending",
    reports: data.rows.flatMap((row) =>
        (["q1", "q2", "q3", "q4"] as const).flatMap((key) => {
            const cell = row[key];
            return cell
                ? [{
                      reportNumber: `${row.storeCode}-${key}`,
                      storeCode: row.storeCode,
                      createdAt: cell.doneAt,
                      createdByNIK: cell.bmsNIK,
                      createdByName: cell.bmsName,
                      totalReal: cell.totalReal,
                  }]
                : [];
        }),
    ),
});
assert.deepEqual(
    pendingQ3.rows.map((row) => row.storeCode),
    ["1A02", "2B01"],
);

const pekanbaru = data.branchSummaries.find((row) => row.branchName === "PEKANBARU");
assert.deepEqual(pekanbaru, {
    branchName: "PEKANBARU",
    totalStores: 2,
    completed: 1,
    pending: 1,
    coverage: 50,
    q1Total: 0,
    q2Total: 0,
    q3Total: 0,
    q4Total: 0,
    yearTotal: 0,
});

assert.equal(data.grandTotal.branchName, "GRAND TOTAL");
assert.equal(data.grandTotal.totalStores, 3);

console.log("preventive annual matrix export assertions passed");
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:

```powershell
npx tsx app/dashboard/preventive/annual-matrix-export.spec.ts
```

Expected: FAIL because `./annual-matrix-export` does not exist yet.

- [ ] **Step 3: Implement the data module**

Create `app/dashboard/preventive/annual-matrix-export.ts` with the interfaces above. The query must:

- authorize `ADMIN`, `BMC`, and `BNM_MANAGER`
- scope stores like `getAdminPreventive`
- fetch all stores matching branch and brand
- fetch all qualifying preventive reports for the selected year
- include `totalReal` in the raw report row
- pick the latest report per store-quarter
- apply `status` against the selected quarter after all Q1-Q4 cells are built

Core helper logic to use:

```ts
export function getPreventiveMatrixQuarterKey(
    quarter: PreventiveMatrixExportQuarter,
): PreventiveMatrixExportQuarterKey {
    return `q${quarter}` as PreventiveMatrixExportQuarterKey;
}

function addAmount(value: number | null) {
    return value === null ? 0 : value;
}

function calculateCoverage(completed: number, total: number) {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}
```

In `shapePreventiveMatrixExportData`, the latest-wins condition must be:

```ts
if (!existing || report.createdAt > existing.doneAt) {
    quarterInfo[quarterKey] = {
        doneAt: report.createdAt,
        bmsName: report.createdByName ?? "",
        bmsNIK: report.createdByNIK ?? "",
        totalReal: report.totalReal,
    };
}
```

The status filter must be:

```ts
const selectedQuarterKey = getPreventiveMatrixQuarterKey(selectedQuarter);
const filteredRows = allRows.filter((row) => {
    if (status === "all") return true;
    const done = row[selectedQuarterKey] !== null;
    return status === "completed" ? done : !done;
});
```

Branch summaries must group only `filteredRows`, and sum quarter totals with `addAmount(row.q1?.totalReal ?? null)` through Q4.

- [ ] **Step 4: Run the data-shaping spec**

Run:

```powershell
npx tsx app/dashboard/preventive/annual-matrix-export.spec.ts
```

Expected: PASS and print `preventive annual matrix export assertions passed`.

- [ ] **Step 5: Commit Task 1**

```powershell
git add app/dashboard/preventive/annual-matrix-export.ts app/dashboard/preventive/annual-matrix-export.spec.ts
git commit -m "feat: add preventive matrix export data"
```

---

### Task 2: XLSX API Route

**Files:**
- Create: `app/api/dashboard/preventive/annual-matrix-export/route.ts`

**Interfaces:**
- Consumes: `getPreventiveMatrixExportData(filters)`.
- Produces: `POST /api/dashboard/preventive/annual-matrix-export`, returning `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

- [ ] **Step 1: Create route with validation and workbook builders**

Create `app/api/dashboard/preventive/annual-matrix-export/route.ts`.

Use local helpers:

```ts
function textCell(value: string | null | undefined): XLSX.CellObject {
    return { t: "s", v: value ?? "" };
}

function moneyCell(value: number | null | undefined): XLSX.CellObject {
    if (value === null || value === undefined) return { t: "s", v: "" };
    return { t: "n", v: value, z: '"Rp"#,##0' };
}
```

Format the matrix triwulan cell as a string:

```ts
function formatQuarterCell(cell: PreventiveMatrixQuarterCell | null) {
    if (!cell) return "Belum";
    const bms = cell.bmsName || cell.bmsNIK || "-";
    return `${formatJakartaDate(cell.doneAt.toISOString())}\n${bms}`;
}
```

Build two sheets:

- `Matriks Tahunan`
- `Ringkasan Cabang`

Always return a workbook, even when `rows` is empty.

- [ ] **Step 2: Validate request body explicitly**

Inside the route, parse:

```ts
type RequestBody = {
    branchName?: string;
    brand?: StoreBrandFilter;
    year?: number;
    quarter?: 1 | 2 | 3 | 4;
    status?: "all" | "completed" | "pending";
};
```

Reject invalid `brand`, `year`, `quarter`, or `status` with HTTP 400 and JSON `{ error: "Filter export tidak valid" }`.

- [ ] **Step 3: Return XLSX attachment**

Use a filename like:

```ts
const fileName = `Matriks_Preventif_${branchSegment}_TW${body.quarter}_${year}.xlsx`;
```

Return:

```ts
return new NextResponse(buf, {
    headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
    },
});
```

- [ ] **Step 4: Smoke test route compilation**

Run:

```powershell
npx tsc --noEmit
```

Expected: no TypeScript errors from the new route or data module.

- [ ] **Step 5: Commit Task 2**

```powershell
git add app/api/dashboard/preventive/annual-matrix-export/route.ts
git commit -m "feat: add preventive matrix export api"
```

---

### Task 3: Matrix Export Dialog

**Files:**
- Create: `app/dashboard/preventive/_components/export-preventive-matrix-dialog.tsx`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`

**Interfaces:**
- Consumes props:

```ts
type ExportPreventiveMatrixDialogProps = {
    branches: string[];
    availableYears: number[];
    defaultBranch: string;
    currentBrand: StoreBrandFilter;
    currentYear: number;
    currentQuarter: PreventiveQuarter;
    showBranchFilter?: boolean;
    showBrandFilter?: boolean;
};
```

- Produces a client dialog that POSTs to `/api/dashboard/preventive/annual-matrix-export`.

- [ ] **Step 1: Create the dialog component**

Create `export-preventive-matrix-dialog.tsx` using the same shadcn imports as the existing export dialog: `Button`, `Dialog`, `Select`, `Label`, `Download`, `Loader2`, and `toast`.

State defaults:

```ts
const [selectedBranch, setSelectedBranch] = useState(defaultBranch || "all");
const [selectedBrand, setSelectedBrand] = useState<StoreBrandFilter>(currentBrand);
const [year, setYear] = useState<number>(currentYear);
const [selectedQuarter, setSelectedQuarter] = useState<string>(String(currentQuarter));
const [status, setStatus] = useState<"all" | "completed" | "pending">("all");
```

The body payload must be:

```ts
{
    branchName: !showBranchFilter || selectedBranch === "all" ? undefined : selectedBranch,
    brand: selectedBrand,
    year,
    quarter: Number(selectedQuarter),
    status,
}
```

Download name should match the server attachment if possible, but client fallback can be:

```ts
`Matriks_Preventif_${branchName}_TW${selectedQuarter}_${year}.xlsx`
```

- [ ] **Step 2: Wire loading, success, and error states**

Use the existing dialog behavior:

```ts
const toastId = toast.loading("Menyiapkan matriks preventif...");
```

On failure, read JSON error when possible and show it through `toast.error`.
On success, create an object URL from the blob, click a temporary anchor, revoke the URL, close the dialog, and show `toast.success("File matriks berhasil diunduh", { id: toastId })`.

- [ ] **Step 3: Add the button to the matrix tab only**

In `admin-preventive-table.tsx`, import the new dialog and render it inside `TabsContent value="matrix"` above the table, aligned right.

Pass:

```tsx
<ExportPreventiveMatrixDialog
    branches={branches}
    availableYears={availableYears}
    defaultBranch={branchName}
    currentBrand={brand}
    currentYear={year}
    currentQuarter={quarter}
    showBranchFilter={showBranchControls}
    showBrandFilter={showBrandFilter}
/>
```

Do not remove or change the existing `actions` header export.

- [ ] **Step 4: Type-check the UI**

Run:

```powershell
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit Task 3**

```powershell
git add app/dashboard/preventive/_components/export-preventive-matrix-dialog.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx
git commit -m "feat: add preventive matrix export dialog"
```

---

### Task 4: Verification And Documentation

**Files:**
- Create: `docs/agent-notes/2026-08-25-2030-preventive-matrix-export.md`
- Modify if needed: `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`

**Interfaces:**
- Consumes completed Tasks 1-3.
- Produces final verification evidence and required task note.

- [ ] **Step 1: Run focused specs**

Run:

```powershell
npx tsx app/dashboard/preventive/annual-matrix-export.spec.ts
npx tsx app/dashboard/preventive/preventive-dashboard.spec.ts
npx tsx app/api/admin/export/access.spec.ts
```

Expected: all print their success messages.

- [ ] **Step 2: Run project checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Expected: both pass, or document any unrelated pre-existing lint failures with exact output.

- [ ] **Step 3: Manually verify download flow**

Start the app:

```powershell
npm run dev
```

Open the admin Checklist Preventif page. In `Matriks Tahunan`, click the new export button and verify:

- dialog shows Cabang, Brand, Tahun, Triwulan, Status
- existing top-level Export XLSX button is still present and unchanged
- exported workbook opens with `Matriks Tahunan` and `Ringkasan Cabang`
- Q1-Q4 columns are visible even when one Triwulan is selected
- `Belum` cells match dashboard semantics
- `totalReal = null` cells are blank and zero values are numeric zero

- [ ] **Step 4: Add task note**

Create a dated note from `docs/agent-notes/TEMPLATE.md` with:

- changed files
- decisions preserved from the design
- commands run and outcomes
- remaining risks

- [ ] **Step 5: Final commit**

```powershell
git add docs/agent-notes/2026-08-25-2030-preventive-matrix-export.md
git commit -m "docs: note preventive matrix export"
```

If Task 4 requires small fixes from verification, include those code files in the final commit with a substantive commit message instead of a docs-only message.

---

## Self-Review

- Spec coverage: Covered dedicated export entry point, popup filters, current dashboard semantics, annual Q1-Q4 workbook, per-store nominal cells, per-branch totals, authorization, empty workbook behavior, and verification.
- Marker scan: No unresolved markers or example-only paths remain.
- Type consistency: The plan consistently uses `PreventiveMatrixExportStatus`, `PreventiveMatrixExportQuarter`, `PreventiveMatrixExportRow`, and `PreventiveMatrixExportData` across data, API, and UI tasks.
