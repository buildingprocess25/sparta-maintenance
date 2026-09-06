# Full PDF Photo Order Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Laporan Lengkap PDF" checklist documentation photos follow canonical dashboard item order and document the manual cache reset path for already-generated full PDFs.

**Architecture:** Move checklist item ordering into shared checklist data helpers so PDF and dashboard use the same natural/canonical item order. Sort full-PDF checklist photo groups before flattening gallery tiles. Existing `Report.fullPdfDriveUrl` values will be nulled manually in production after deploy so the next click regenerates the corrected version.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Prisma 7, `@react-pdf/renderer`, Node `tsx`.

## Global Constraints

- Read `AI_RULES.md` and relevant canonical docs before implementation.
- Preserve the standard final PDF approval flow; only "Laporan Lengkap PDF" documentation ordering and its cache reset path may change.
- Do not delete Google Drive files as part of this fix; only the database cache pointer should be cleared manually after deploy.
- Create a dated task note in `docs/agent-notes/` before finishing file-changing work.

---

## File Structure

- Modify `lib/checklist-data.ts`: export shared item-order helpers.
- Modify `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`: reuse shared comparator instead of private duplicate logic.
- Modify `lib/pdf/report-pdf-full-builder.ts`: sort checklist photo items before passing them to full PDF gallery generation.
- Modify `lib/pdf/generate-report-pdf-gallery.spec.ts`: add regression coverage for unordered checklist items.
- Create `app/api/dashboard/preventive/annual-matrix-export/format.ts`: hold XLSX cell formatting helpers that cannot be exported from a Next route module.
- Create `app/api/photos/upload/handler.ts`: hold upload route factory logic that cannot be exported from a Next route module.
- Modify related route/test files so App Router route modules only export valid route handlers/config.
- Create `docs/agent-notes/YYYY-MM-DD-HHMM-full-pdf-photo-order-reset.md`: record implementation and verification.

### Task 1: Share Canonical Checklist Item Ordering

**Files:**
- Modify: `lib/checklist-data.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`

**Interfaces:**
- Produces: `compareChecklistItemIds(a: string, b: string): number`
- Produces: `compareChecklistItemsById<T extends { itemId: string }>(a: T, b: T): number`
- Consumes: existing `REPORT_CHECKLIST_ITEMS`

- [ ] **Step 1: Export shared comparator functions from checklist data**

Add these functions near `getChecklistItemMeta` in `lib/checklist-data.ts`:

```ts
const checklistOrderById = new Map(
    REPORT_CHECKLIST_ITEMS.map((item, index) => [item.id, index]),
);

export function compareChecklistItemIds(a: string, b: string): number {
    const rankA = checklistOrderById.get(a);
    const rankB = checklistOrderById.get(b);

    if (rankA !== undefined && rankB !== undefined) {
        return rankA - rankB;
    }
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;

    const parsedA = parseChecklistItemId(a);
    const parsedB = parseChecklistItemId(b);
    if (parsedA.prefix !== parsedB.prefix) {
        return parsedA.prefix.localeCompare(parsedB.prefix);
    }
    if (parsedA.number !== parsedB.number) {
        return parsedA.number - parsedB.number;
    }
    return a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" });
}

export function compareChecklistItemsById<T extends { itemId: string }>(
    a: T,
    b: T,
): number {
    return compareChecklistItemIds(a.itemId, b.itemId);
}

function parseChecklistItemId(itemId: string): { prefix: string; number: number } {
    const match = itemId.trim().match(/^([A-Za-z]+)\s*0*(\d+)/);
    if (!match) return { prefix: itemId.trim().toUpperCase(), number: 0 };
    return {
        prefix: match[1].toUpperCase(),
        number: Number(match[2]),
    };
}
```

- [ ] **Step 2: Replace dashboard private comparator**

Import `compareChecklistItemsById` and `compareChecklistItemIds` from `@/lib/checklist-data`, make `compareReportItems`, `compareChecklistRows`, and `compareChecklistGroups` call shared helpers, then delete the private `compareItemIds` and `parseItemId` functions.

- [ ] **Step 3: Run detail-data tests**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'
node_modules\.bin\tsx.cmd app\dashboard\reports\[reportNumber]\_lib\detail-data.spec.ts
node_modules\.bin\tsx.cmd app\dashboard\reports\detail-data-aho.spec.ts
```

Expected: both tests pass.

### Task 2: Sort Full PDF Checklist Photos Before Gallery Flattening

**Files:**
- Modify: `lib/pdf/report-pdf-full-builder.ts`
- Modify: `lib/pdf/generate-report-pdf-gallery.spec.ts`

**Interfaces:**
- Consumes: `compareChecklistItemsById` from `@/lib/checklist-data`
- Produces: `extractChecklistPhotos(items)` output ordered by canonical checklist item order.

- [ ] **Step 1: Write failing regression coverage**

In `lib/pdf/generate-report-pdf-gallery.spec.ts`, change unordered input to `A2`, `A10`, `A1`, `A4`, sort with `compareChecklistItemsById`, flatten, and assert output order `A1`, `A2`, `A4`, `A10`.

- [ ] **Step 2: Run the gallery test and confirm current behavior fails before implementation**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'
node_modules\.bin\tsx.cmd lib\pdf\generate-report-pdf-gallery.spec.ts
```

Expected before implementation: FAIL because the PDF photo path still preserves raw input order.

- [ ] **Step 3: Implement the full PDF sort**

Import `compareChecklistItemsById` in `lib/pdf/report-pdf-full-builder.ts` and change the return chain to sort after filtering:

```ts
        .filter((item) => item.photoUrls.length > 0)
        .sort(compareChecklistItemsById);
```

- [ ] **Step 4: Run the gallery test again**

Run the same `tsx` command.

Expected: PASS.

### Task 3: Fix Next Route Export Build Blockers

**Files:**
- Create: `app/api/dashboard/preventive/annual-matrix-export/format.ts`
- Modify: `app/api/dashboard/preventive/annual-matrix-export/route.ts`
- Create: `app/api/photos/upload/handler.ts`
- Modify: `app/api/photos/upload/route.ts`
- Modify: `app/api/photos/upload/route.spec.ts`

**Interfaces:**
- Produces: route modules that only export Next-supported route handlers/config.
- Preserves: `createPhotoUploadPostHandler(deps)` for existing upload route tests.

- [ ] **Step 1: Move annual matrix export formatter**

Move `formatQuarterCellForExport` from `route.ts` to sibling `format.ts`, import it back into `route.ts`, and remove the extra non-handler export from the route module.

- [ ] **Step 2: Move photo upload handler factory**

Move `createPhotoUploadPostHandler`, its dependency types, and private helper functions from `app/api/photos/upload/route.ts` to `app/api/photos/upload/handler.ts`. Keep `route.ts` as dependency wiring that only exports `POST`.

- [ ] **Step 3: Update upload route test import**

Change `app/api/photos/upload/route.spec.ts` to import `createPhotoUploadPostHandler` from `./handler`.

- [ ] **Step 4: Scan route exports**

Run a scan over `app/api/**/route.ts` and confirm exported members are route handlers or supported route config.

### Task 4: Verification, Docs, and Final State

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-full-pdf-photo-order-reset.md`

**Interfaces:**
- Consumes: all changes from Tasks 1-3.
- Produces: verified source and task note.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'
node_modules\.bin\tsx.cmd lib\pdf\generate-report-pdf-gallery.spec.ts
node_modules\.bin\tsx.cmd app\dashboard\reports\[reportNumber]\_lib\detail-data.spec.ts
node_modules\.bin\tsx.cmd app\dashboard\reports\detail-data-aho.spec.ts
```

Expected: all pass.

- [ ] **Step 2: Run build**

Run:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
node_modules\.bin\next.cmd build
```

Expected: PASS.

- [ ] **Step 3: Write task note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-full-pdf-photo-order-reset.md` documenting scope, files, decisions, verification, and production reset instructions.

- [ ] **Step 4: Check git status**

Run:

```powershell
git -c safe.directory=D:/MAGANG-ALFA/sparta-maintenance status --short
```

Expected: only relevant source, plan, and note files changed.
