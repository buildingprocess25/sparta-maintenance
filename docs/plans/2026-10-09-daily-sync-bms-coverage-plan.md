# Daily Sync BMS Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an automated daily synchronization system (`Daily Sync BMS Coverage`) that fetches BMS store coverage assignments from a multi-sheet Google Spreadsheet, parses store-to-BMS mappings, and updates database assignments (`BmsStoreAssignment`) to match the spreadsheet 100% with informative logging.

**Architecture:** Create a core sync job module `lib/jobs/sync-bms-coverage.ts` utilizing `googleapis` to dynamically discover all sheet tabs (representing branches), fetch rows in batch, parse target columns (`KODE TOKO`, `NIK BMS`, `NAMA BMS`), compare with active database assignments, and execute upserts and deactivations inside a Prisma transaction. Expose an API endpoint `app/api/cron/sync-bms-coverage/route.ts` protected by `CRON_SECRET` for Dokploy scheduled execution, accompanied by a CLI script `scripts/sync-bms-coverage-from-sheet.ts` for manual dry-run/sync execution.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM, Google Sheets API v4 (`googleapis`), Pino Logger.

## Global Constraints

- Do not disrupt existing store master sync (`sync-stores`).
- Handle multi-sheet spreadsheets dynamically (fetching all tab names automatically).
- Store code matching is the primary key for lookup (case-insensitive, trimmed).
- Unrecognized store codes in spreadsheet that do not exist in `prisma.store` must be safely skipped with clear log warnings.
- Informative and detailed log summaries must be produced for auditability.
- Include dated task note in `docs/agent-notes/` upon completion per project rules in `AGENTS.md`.

---

### Task 1: Environment Variables & Job Core Parser Interface

**Files:**
- Modify: `.env.example:20-25`
- Create: `lib/jobs/sync-bms-coverage.ts`

**Interfaces:**
- Produces: `syncBmsCoverageFromSheet()`, `SyncBmsCoverageResult` type.

- [ ] **Step 1: Update `.env.example`**

Add `GOOGLE_BMS_COVERAGE_SPREADSHEET_ID` configuration:

```env
# ID Spreadsheet Google Drive untuk Daily Sync BMS Coverage
GOOGLE_BMS_COVERAGE_SPREADSHEET_ID=""
```

- [ ] **Step 2: Create `lib/jobs/sync-bms-coverage.ts`**

Implement Google Sheets API multi-sheet discovery, row parsing, DB comparison, transaction execution, and informative log summary generation:

```typescript
import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type SheetBmsAssignment = {
    branchSheetName: string;
    storeCode: string;
    storeName: string;
    bmsNIK: string | null;
    bmsName: string | null;
};

export type SyncBmsCoverageResult = {
    totalSheetsProcessed: number;
    sheetNames: string[];
    totalRowsParsed: number;
    created: number;
    deactivated: number;
    unchanged: number;
    skippedMissingStores: string[];
    skippedInvalidNiks: number;
    details: {
        newAssignments: Array<{ storeCode: string; bmsNIK: string }>;
        deactivatedAssignments: Array<{ storeCode: string; oldBmsNIK: string }>;
    };
};

// Core sync implementation ...
```

- [ ] **Step 3: Verify TypeScript compilation of Task 1**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 2: Implement Cron API Route & CLI Script

**Files:**
- Create: `app/api/cron/sync-bms-coverage/route.ts`
- Create: `scripts/sync-bms-coverage-from-sheet.ts`

**Interfaces:**
- Consumes: `syncBmsCoverageFromSheet()` from `@/lib/jobs/sync-bms-coverage`
- Produces: `POST /api/cron/sync-bms-coverage` endpoint and `npx tsx scripts/sync-bms-coverage-from-sheet.ts` CLI tool.

- [ ] **Step 1: Create `app/api/cron/sync-bms-coverage/route.ts`**

Implement POST endpoint authenticated via `CRON_SECRET` Bearer header:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { syncBmsCoverageFromSheet } from "@/lib/jobs/sync-bms-coverage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
    if (!process.env.CRON_SECRET) {
        logger.error({ operation: "cron.syncBmsCoverage" }, "CRON_SECRET is not configured");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await syncBmsCoverageFromSheet();
        logger.info({ operation: "cron.syncBmsCoverage", result }, "BMS Coverage Sync Completed Successfully");
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error({ operation: "cron.syncBmsCoverage" }, "BMS Coverage sync cron job failed", error);
        return NextResponse.json({ error: "BMS Coverage sync failed" }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create `scripts/sync-bms-coverage-from-sheet.ts`**

Implement CLI wrapper with dry-run support:

```typescript
import prisma from "../lib/prisma";
import { syncBmsCoverageFromSheet } from "../lib/jobs/sync-bms-coverage";

async function main() {
    console.log("=== Starting Daily Sync BMS Coverage from Google Sheet ===");
    const result = await syncBmsCoverageFromSheet();
    console.log("\n=== Sync Summary ===");
    console.log(`Sheets Processed: ${result.totalSheetsProcessed} (${result.sheetNames.join(", ")})`);
    console.log(`Total Rows Parsed: ${result.totalRowsParsed}`);
    console.log(`Assignments Created/Updated: ${result.created}`);
    console.log(`Assignments Deactivated: ${result.deactivated}`);
    console.log(`Unchanged Assignments: ${result.unchanged}`);
    console.log(`Skipped (Stores not found in DB): ${result.skippedMissingStores.length}`);
    if (result.skippedMissingStores.length > 0) {
        console.log(`  List: ${result.skippedMissingStores.join(", ")}`);
    }
    console.log("=== Sync Finished Successfully ===");
}

main()
    .catch((err) => {
        console.error("Sync BMS Coverage failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
```

- [ ] **Step 3: Verify TypeScript compilation of Task 2**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

---

### Task 3: Build Verification, Task Note & Live Tracker Update

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-daily-sync-bms-coverage.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Execute `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 2: Update `docs/plans/task.md`**

Update live tracker status table.

- [ ] **Step 3: Create Task Note in `docs/agent-notes/`**

Create dated task note using Asia/Jakarta timestamp following `AGENTS.md` guidelines.
