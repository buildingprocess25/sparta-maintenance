# PJUM XLSX Export for BMC and BNM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `BMC` and `BNM_MANAGER` to download the existing PJUM recap workbook from `/dashboard/pjum` while enforcing assigned-branch scope on the server.

**Architecture:** Reuse the existing PJUM dialog, export query, workbook builder, and `POST /api/admin/export`. Extract only the limited-role authorization decision into a pure helper so branch and sheet rules receive an executable regression check, then expose the existing dialog in the page header for BMC and BNM.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript 5.9, Node `assert`, `tsx`, existing `xlsx` 0.18.5 export pipeline.

## Global Constraints

- Keep the workbook as one row per PJUM document.
- Keep sheet name `Rekap PJUM`, filename `Rekap_PJUM_YYYYMMDD.xlsx`, column order, and cell types unchanged.
- Keep export filters independent from table filters: date range, branch, and BMS name/NIK only.
- Treat assigned branches as the server-enforced access boundary for BMC and BNM; do not add automatic area scoping.
- Preserve existing ADMIN, reports-only, and BMC preventive export behavior.
- Add no dependency, database model, migration, new export endpoint, status filter, or area filter.
- Do not modify `ExportPjumDialog`, `fetchPjumExportRows`, or `buildPjumSheet` unless verification proves the existing implementation is broken.

---

## Source Spec

- `docs/superpowers/specs/2026-07-20-pjum-xlsx-export-bmc-bnm-design.md`

## File Structure

Create:

- `app/api/admin/export/access.ts` — pure limited-role sheet authorization and branch normalization.
- `app/api/admin/export/access.spec.ts` — executable assertions for BMC/BNM export access and existing preventive restrictions.

Modify:

- `app/api/admin/export/route.ts` — delegate the existing BMC/BNM authorization block to the tested helper and allow PJUM-only exports.
- `app/dashboard/pjum/page.tsx` — render the existing export dialog for BMC and BNM while preserving BMC's create action.

Do not modify:

- `app/dashboard/pjum/_components/export-pjum-dialog.tsx`
- `app/admin/export/queries.ts`
- the workbook builders in `app/api/admin/export/route.ts`

---

### Task 1: Test and Implement Limited-Role Export Scope

**Files:**

- Create: `app/api/admin/export/access.spec.ts`
- Create: `app/api/admin/export/access.ts`
- Modify: `app/api/admin/export/route.ts:1-11,344-385`

**Interfaces:**

- Consumes: authenticated role, `requestedSheets`, client-selected branches, and authenticated `user.branchNames` from the route.
- Produces: `resolveLimitedExportScope(input): LimitedExportScopeResult`, returning either normalized permitted branches or an HTTP-ready `400`/`403` error.

- [ ] **Step 1: Write the failing access regression check**

Create `app/api/admin/export/access.spec.ts`:

```ts
import assert from "node:assert/strict";
import { resolveLimitedExportScope } from "./access";

const assignedBranches = ["BRANCH A", "BRANCH B", ""];

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["pjum"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH A", "BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["pjum"],
        selectedBranches: ["BRANCH B"],
        assignedBranches,
    }),
    { ok: true, branchNames: ["BRANCH B"] },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["pjum"],
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
        requestedSheets: ["materials"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["reports", "pjum"],
        selectedBranches: [],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BMC",
        requestedSheets: ["preventive"],
        selectedBranches: [],
        assignedBranches,
    }),
    {
        ok: false,
        status: 400,
        error: "Pilih satu cabang untuk ekspor preventif",
    },
);

assert.deepEqual(
    resolveLimitedExportScope({
        role: "BNM_MANAGER",
        requestedSheets: ["preventive"],
        selectedBranches: ["BRANCH A"],
        assignedBranches,
    }),
    { ok: false, status: 403, error: "Forbidden" },
);

console.log("limited export access assertions passed");
```

- [ ] **Step 2: Run the regression check and confirm it fails**

Run:

```bash
npx tsx app/api/admin/export/access.spec.ts
```

Expected: FAIL because `./access` does not exist.

- [ ] **Step 3: Implement the smallest pure access helper**

Create `app/api/admin/export/access.ts`:

```ts
export type LimitedExportRole = "BMC" | "BNM_MANAGER";

export type ExportSheet =
    | "reports"
    | "materials"
    | "pjum"
    | "preventive";

type LimitedExportScopeResult =
    | { ok: true; branchNames: string[] }
    | { ok: false; status: 400 | 403; error: string };

export function resolveLimitedExportScope(input: {
    role: LimitedExportRole;
    requestedSheets: ExportSheet[];
    selectedBranches: string[];
    assignedBranches: string[];
}): LimitedExportScopeResult {
    const { role, requestedSheets, selectedBranches, assignedBranches } = input;
    const requestedSheet =
        requestedSheets.length === 1 ? requestedSheets[0] : undefined;
    const isAllowedSheet =
        requestedSheet === "reports" ||
        requestedSheet === "pjum" ||
        (role === "BMC" && requestedSheet === "preventive");

    if (!isAllowedSheet) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    if (requestedSheet === "preventive" && selectedBranches.length !== 1) {
        return {
            ok: false,
            status: 400,
            error: "Pilih satu cabang untuk ekspor preventif",
        };
    }

    const branchNames =
        selectedBranches.length > 0
            ? selectedBranches
            : assignedBranches.filter((branchName) => branchName.trim());
    const hasUnauthorizedBranch = branchNames.some(
        (branchName) => !assignedBranches.includes(branchName),
    );

    if (hasUnauthorizedBranch) {
        return {
            ok: false,
            status: 403,
            error: "Anda tidak punya akses ke cabang ini",
        };
    }

    return { ok: true, branchNames };
}
```

- [ ] **Step 4: Run the helper check and confirm it passes**

Run:

```bash
npx tsx app/api/admin/export/access.spec.ts
```

Expected:

```text
limited export access assertions passed
```

- [ ] **Step 5: Replace the route's inline limited-role block**

In `app/api/admin/export/route.ts`, add this import after the query imports:

```ts
import { resolveLimitedExportScope } from "./access";
```

Replace the existing `if (user.role === "BMC" || user.role === "BNM_MANAGER")` block with:

```ts
  if (user.role === "BMC" || user.role === "BNM_MANAGER") {
    const selectedBranches = Array.isArray(filter.branchName)
      ? filter.branchName
      : filter.branchName
        ? [filter.branchName]
        : [];
    const access = resolveLimitedExportScope({
      role: user.role,
      requestedSheets,
      selectedBranches,
      assignedBranches: user.branchNames,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    filter.branchName = access.branchNames;
  }
```

This preserves reports-only and BMC preventive behavior while adding PJUM-only access for both limited roles.

- [ ] **Step 6: Run focused automated and static checks**

Run:

```bash
npx tsx app/api/admin/export/access.spec.ts
npx eslint app/api/admin/export/access.ts app/api/admin/export/access.spec.ts app/api/admin/export/route.ts
npx tsc --noEmit
```

Expected:

```text
limited export access assertions passed
```

ESLint and TypeScript should exit `0` without errors.

- [ ] **Step 7: Review the backend diff**

Run:

```bash
git diff --check
git diff -- app/api/admin/export/access.ts app/api/admin/export/access.spec.ts app/api/admin/export/route.ts
```

Confirm that the workbook builders, export queries, ADMIN branch behavior, and response filename are unchanged.

- [ ] **Step 8: Commit the tested backend scope change**

Run:

```bash
git add app/api/admin/export/access.ts app/api/admin/export/access.spec.ts app/api/admin/export/route.ts
git commit -m "feat: scope pjum exports by role"
```

---

### Task 2: Expose the Existing Dialog to BMC and BNM

**Files:**

- Modify: `app/dashboard/pjum/page.tsx:69-77`

**Interfaces:**

- Consumes: existing `branches`, `bmsUsers`, `CreatePjumDialog`, and `ExportPjumDialog` values already prepared by the Server Component.
- Produces: BMC header with create and export actions; ADMIN and BNM header with export action only.

- [ ] **Step 1: Record the current role behavior before editing**

Run the development server:

```bash
npm run dev
```

Confirm in `/dashboard/pjum`:

- ADMIN sees `Ekspor XLSX`.
- BMC sees `Buat PJUM` but not `Ekspor XLSX`.
- BNM sees neither header action.

Stop the development server after recording this baseline.

- [ ] **Step 2: Render the minimum role-specific action composition**

In `app/dashboard/pjum/page.tsx`, replace the current `headerActions` expression with:

```tsx
            headerActions={
                user.role === "BMC" ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <CreatePjumDialog bmsUsers={bmsUsers} />
                        <ExportPjumDialog branches={branches} />
                    </div>
                ) : (
                    <ExportPjumDialog branches={branches} />
                )
            }
```

All users reaching this expression have already passed the ADMIN/BMC/BNM role guard. BNM therefore receives only the existing export dialog and never receives `CreatePjumDialog`.

- [ ] **Step 3: Run focused static checks**

Run:

```bash
npx eslint app/dashboard/pjum/page.tsx
npx tsc --noEmit
```

Expected: both commands exit `0` without errors.

- [ ] **Step 4: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 5: Perform role and export smoke checks**

Run:

```bash
npm run dev
```

Verify:

- ADMIN still sees `Ekspor XLSX` and downloads the unchanged workbook.
- BMC sees `Buat PJUM` and `Ekspor XLSX`; both actions remain usable on desktop and narrow widths.
- BNM sees `Ekspor XLSX` and does not see `Buat PJUM`.
- BMC export with no selected branch contains only PJUM rows from all assigned branches.
- BNM export with one assigned branch contains only that branch.
- The downloaded file is named `Rekap_PJUM_YYYYMMDD.xlsx`.
- The workbook contains sheet `Rekap PJUM` with the twelve columns defined in the spec.

Then use the browser's network panel or an equivalent authenticated request to send a BMC/BNM export body containing a branch outside `user.branchNames`:

```json
{
  "filter": { "branchName": ["FOREIGN BRANCH"] },
  "sheets": ["pjum"]
}
```

Expected: HTTP `403` with:

```json
{ "error": "Anda tidak punya akses ke cabang ini" }
```

Stop the development server after verification.

- [ ] **Step 6: Review and commit the page change**

Run:

```bash
git diff --check
git diff -- app/dashboard/pjum/page.tsx
git add app/dashboard/pjum/page.tsx
git commit -m "feat: expose pjum export to bmc bnm"
```

---

### Task 3: Final Regression Verification

**Files:**

- Verify: `app/api/admin/export/access.ts`
- Verify: `app/api/admin/export/access.spec.ts`
- Verify: `app/api/admin/export/route.ts`
- Verify: `app/dashboard/pjum/page.tsx`

**Interfaces:**

- Consumes: completed backend scope and page action tasks.
- Produces: a clean, buildable change set with an executable security regression check.

- [ ] **Step 1: Run the security regression check again**

Run:

```bash
npx tsx app/api/admin/export/access.spec.ts
```

Expected:

```text
limited export access assertions passed
```

- [ ] **Step 2: Run lint and TypeScript across the complete change set**

Run:

```bash
npx eslint app/api/admin/export/access.ts app/api/admin/export/access.spec.ts app/api/admin/export/route.ts app/dashboard/pjum/page.tsx
npx tsc --noEmit
```

Expected: both commands exit `0` without errors.

- [ ] **Step 3: Run a clean production build**

Run:

```bash
npm run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 4: Inspect final scope**

Run:

```bash
git status --short --branch
git log -3 --oneline
git diff HEAD~2..HEAD --stat
git diff --check HEAD~2..HEAD
```

Confirm the implementation consists only of the two new access files plus the export route and PJUM page changes. Do not create an empty verification commit.

## Self-Review

- Spec coverage: BMC and BNM UI access, identical workbook format, assigned-branch enforcement, preserved ADMIN behavior, error handling, automated security checks, and manual workbook verification are covered.
- Placeholder scan: every code change, test body, command, and expected result is explicit.
- Type consistency: `ExportSheet` matches the route body union; `LimitedExportRole` matches the two roles passed by the route; `branchNames` maps directly back to `ExportFilter.branchName`.
- Scope check: no area/status filters, new endpoint, dependency, database change, workbook rewrite, or dialog rewrite is included.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-pjum-xlsx-export-bmc-bnm.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** — execute tasks in this session with batch checkpoints.

Choose an execution mode before implementing.
