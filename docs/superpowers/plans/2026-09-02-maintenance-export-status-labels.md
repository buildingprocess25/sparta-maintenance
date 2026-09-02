# Maintenance Export Status Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `Status` column in the admin maintenance XLSX export show the same user-friendly labels used by the dashboard.

**Architecture:** Keep status codes unchanged in queries, filters, and database flow. Convert the status code only at the XLSX presentation boundary by reusing the global `getReportStatusLabel()` helper already used by dashboard status badges.

**Tech Stack:** Next.js route handler, TypeScript, `xlsx`, existing `lib/report-status.ts` mapper.

## Global Constraints

- Scope is only the `Status` column in the `Rekap Laporan` maintenance export sheet.
- Do not change database status values, filter payloads, report workflow logic, or dashboard rendering.
- Skip test-driven-development by explicit user request for faster execution.
- Use the existing global status label helper so dashboard and XLSX labels stay aligned.
- Unknown status strings must still be exported as their original raw value through `getReportStatusLabel()` fallback behavior.
- Use `apply_patch` for manual edits.
- Create/update the required agent note before finishing file-changing work.

---

## File Structure

- Modify `app/api/admin/export/route.ts`: import `getReportStatusLabel` and use it when writing the `Status` cell in `buildReportSheet()`.
- Create `docs/agent-notes/2026-09-02-HHMM-maintenance-export-status-labels.md`: required task note with context, changed files, decisions, verification, and remaining risk.
- No schema, query, frontend, or XLSX header changes are needed.

### Task 1: Use Friendly Status Labels in Maintenance XLSX

**Files:**
- Modify: `app/api/admin/export/route.ts`
- Create: `docs/agent-notes/2026-09-02-HHMM-maintenance-export-status-labels.md`

**Interfaces:**
- Consumes: `getReportStatusLabel(status: string): string` from `@/lib/report-status`.
- Produces: The `Rekap Laporan` sheet writes friendly labels such as `Review BNM`, `Selesai`, `Dikerjakan`, and `Revisi Pekerjaan` in the `Status` column.

- [ ] **Step 1: Add the status label import**

In `app/api/admin/export/route.ts`, add this import near the other `@/lib/*` imports:

```ts
import { getReportStatusLabel } from "@/lib/report-status";
```

The top import block should include:

```ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import {
  fetchReportExportRows,
  fetchMaterialExportRows,
  fetchPjumExportRows,
  fetchPreventiveExportRows,
  type ExportFilter,
} from "@/app/admin/export/queries";
import { toExcelJakartaSerial } from "@/lib/time";
import { resolveLimitedExportScope } from "./access";
import { parseStoreBrandFilter } from "@/lib/store-brand-filter";
import { getReportStatusLabel } from "@/lib/report-status";
```

- [ ] **Step 2: Map only the maintenance report sheet status cell**

In `buildReportSheet()`, replace the raw status cell:

```ts
textCell(r.status),
```

with:

```ts
textCell(getReportStatusLabel(r.status)),
```

Only replace the `textCell(r.status)` inside `buildReportSheet()` for the `Rekap Laporan` sheet. Leave the `textCell(r.status)` inside `buildPjumSheet()` unchanged because the user confirmed the request is focused on maintenance report status only.

- [ ] **Step 3: Create the required agent note**

Create `docs/agent-notes/2026-09-02-HHMM-maintenance-export-status-labels.md` using Asia/Jakarta time in the filename. Use this content shape:

```markdown
# Maintenance export status labels

## Scope

Changed the admin maintenance XLSX export so the `Status` column in `Rekap Laporan` uses dashboard-friendly report status labels.

## Context and Sources

- User screenshots showed dashboard status badges using friendly labels while XLSX export showed raw status codes.
- `lib/report-status.ts` defines `getReportStatusLabel()`.
- `app/reports/[reportNumber]/_components/status-badge.tsx` uses `getReportStatusLabel()` for dashboard labels.
- `app/api/admin/export/route.ts` wrote `textCell(r.status)` in `buildReportSheet()`.

## Changed Files

- `app/api/admin/export/route.ts`: map maintenance report status codes through `getReportStatusLabel()` before writing XLSX cells.
- `docs/superpowers/plans/2026-09-02-maintenance-export-status-labels.md`: rapid implementation plan.

## Decisions

- Keep filters, queries, and database values as raw status codes.
- Convert status code to user-facing text only in the XLSX builder.
- Leave the PJUM export sheet unchanged because it is outside the confirmed scope.
- Skip TDD by explicit user request; use fast verification instead.

## Verification

- `npm run lint -- app/api/admin/export/route.ts lib/report-status.ts`
- Source check that `buildReportSheet()` writes `getReportStatusLabel(r.status)` for the `Status` cell.

## Remaining Work and Risks

None.
```

- [ ] **Step 4: Run fast verification**

Run:

```powershell
npm run lint -- app/api/admin/export/route.ts lib/report-status.ts
```

Expected: ESLint completes without new errors in the touched files.

Then run:

```powershell
rg -n "getReportStatusLabel\\(r\\.status\\)|textCell\\(r\\.status\\)" app/api/admin/export/route.ts
```

Expected:

```text
buildReportSheet has textCell(getReportStatusLabel(r.status))
buildPjumSheet may still have textCell(r.status)
```

- [ ] **Step 5: Review the diff**

Run:

```powershell
git -c safe.directory='D:/MAGANG-ALFA/sparta-maintenance' diff -- app/api/admin/export/route.ts docs/superpowers/plans/2026-09-02-maintenance-export-status-labels.md docs/agent-notes
```

Expected:

```text
Only the XLSX report status cell, the implementation plan, and the required agent note changed.
```

## Self-Review

- Spec coverage: The plan covers the confirmed scope, which is only the `Status` column in the `Rekap Laporan` maintenance export.
- Placeholder scan: No unfinished placeholder text or unspecified implementation steps remain.
- Type consistency: `getReportStatusLabel(status: string): string` accepts `r.status` and returns a string suitable for `textCell()`.
