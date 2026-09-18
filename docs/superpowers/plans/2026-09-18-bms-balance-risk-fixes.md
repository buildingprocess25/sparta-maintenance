# BMS Balance Risk Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two BMS balance enforcement gaps found on `feat/bms-balance`: PJUM lock bypass through photo start-work and missing balance validation on estimation resubmit.

**Architecture:** Keep fixes inside existing server actions instead of adding new services. Reuse `isBmsLockedByPjum`, `validateEstimationLimit`, `getBmsActivePeriod`, `createNewBmsPeriod`, and `hasBmsRepairItems` from `lib/balance.ts` so submit and resubmit paths share the same business rules.

**Tech Stack:** Next.js 16 App Router server actions, TypeScript 5, Prisma 7, Node built-in `assert`, local `tsx` test registration.

## Global Constraints

- Read `AI_RULES.md`, relevant canonical docs, and recent agent notes before editing.
- Use shadcn/ui first for UI work; this plan has no UI component work.
- Do not change database schema or migrations for this fix.
- Do not use `prisma db push` for this fix.
- Preserve BMS balance cutoff: `2026-09-01T00:00:00.000+07:00`.
- Preserve current PJUM lifecycle semantics: active hanging reports are represented by `pjumHangingAt != null`, `pjumExpiredAt == null`, and `pjumExportedAt == null`.
- Before finishing file changes, create one dated note in `docs/agent-notes/` using Asia/Jakarta time.

---

## File Structure

- `app/reports/actions/start-work-with-photos.ts`: add the same PJUM lock server guard already present in `start-work.ts`.
- `app/reports/actions/resubmit.ts`: validate balance-impacting estimation revisions before updating the report, and ensure an active period is attached when needed.
- `app/reports/actions/bms-balance-guards.spec.ts`: new focused static regression spec that verifies both guarded paths keep the required imports, calls, and persisted fields.
- `docs/project/10-bms-weekly-balance.md`: no behavior change expected; update only if implementation discovers a permanent rule change.
- `docs/agent-notes/YYYY-MM-DD-HHMM-bms-balance-risk-fixes.md`: required task note after implementation.

---

### Task 1: Block Photo Start-Work During PJUM Lock

**Files:**
- Modify: `app/reports/actions/start-work-with-photos.ts`
- Create: `app/reports/actions/bms-balance-guards.spec.ts`

**Interfaces:**
- Consumes: `isBmsLockedByPjum(bmsNIK: string): Promise<boolean>` from `@/lib/balance`.
- Produces: `startWorkWithPhotos(reportNumber: string, photos: StartWorkPhotoInput)` now rejects locked BMS users before changing `ESTIMATION_APPROVED` to `IN_PROGRESS`.

- [ ] **Step 1: Write the failing static regression test**

Create `app/reports/actions/bms-balance-guards.spec.ts` with this exact content:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const startWorkWithPhotosSource = readFileSync(
    "app/reports/actions/start-work-with-photos.ts",
    "utf8",
);

assert.match(
    startWorkWithPhotosSource,
    /import\s+\{\s*isBmsLockedByPjum\s*\}\s+from\s+"@\/lib\/balance";/,
    "startWorkWithPhotos must import isBmsLockedByPjum",
);
assert.match(
    startWorkWithPhotosSource,
    /const\s+isLocked\s*=\s*await\s+isBmsLockedByPjum\(user\.NIK\);/,
    "startWorkWithPhotos must check whether the BMS period is locked",
);
assert.match(
    startWorkWithPhotosSource,
    /if\s*\(\s*isLocked\s*\)\s*\{\s*return\s*\{\s*error:/s,
    "startWorkWithPhotos must return an error while locked",
);
assert(
    startWorkWithPhotosSource.indexOf("isBmsLockedByPjum(user.NIK)") <
        startWorkWithPhotosSource.indexOf("ReportStatus.ESTIMATION_APPROVED"),
    "lock check must run before the status transition guard and update path",
);

console.log("BMS balance server guard assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"
```

Expected: FAIL with `startWorkWithPhotos must import isBmsLockedByPjum`.

- [ ] **Step 3: Add lock guard to `start-work-with-photos.ts`**

Modify the imports near the existing imports:

```ts
import { getStartWorkEvidenceError } from "@/lib/start-work-evidence";
import { isBmsLockedByPjum } from "@/lib/balance";
import type { MaterialStoreJson } from "@/types/report";
```

Add this block immediately after ownership validation and before the `report.status !== ReportStatus.ESTIMATION_APPROVED` check:

```ts
    const isLocked = await isBmsLockedByPjum(user.NIK);
    if (isLocked) {
      return {
        error:
          "Saldo operasional Anda sedang terkunci karena ada PJUM yang menunggu persetujuan BNM Manager. Harap tunggu hingga PJUM diproses sebelum memulai pekerjaan baru.",
      };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"
```

Expected: PASS and prints `BMS balance server guard assertions passed`.

- [ ] **Step 5: Run a focused type check for the changed action**

Run:

```powershell
node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false --esModuleInterop true app/reports/actions/start-work-with-photos.ts app/reports/actions/bms-balance-guards.spec.ts
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit task 1**

```powershell
git add -- app/reports/actions/start-work-with-photos.ts app/reports/actions/bms-balance-guards.spec.ts
git commit -m "fix: block locked bms start work"
```

---

### Task 2: Validate Balance on Estimation Resubmit

**Files:**
- Modify: `app/reports/actions/resubmit.ts`
- Modify: `app/reports/actions/bms-balance-guards.spec.ts`

**Interfaces:**
- Consumes: `hasBmsRepairItems(items: unknown): boolean`, `validateEstimationLimit(bmsNIK: string, estimationAmount: number): Promise<string | null>`, `getBmsActivePeriod(bmsNIK: string)`, and `createNewBmsPeriod(bmsNIK: string, pjumExportId?: string)`.
- Produces: `resubmitReport(reportNumber: string, data: DraftData)` validates revised BMS estimations against available balance and persists `balancePeriodId` when a balance-impacting report did not already have one.

- [ ] **Step 1: Extend the failing static regression test**

Append the following block to `app/reports/actions/bms-balance-guards.spec.ts`, before the final `console.log` line. If Task 1 already added the console line, move it to the bottom after this new block.

```ts
const resubmitSource = readFileSync("app/reports/actions/resubmit.ts", "utf8");

assert.match(
    resubmitSource,
    /import\s+\{[^}]*validateEstimationLimit[^}]*getBmsActivePeriod[^}]*hasBmsRepairItems[^}]*createNewBmsPeriod[^}]*\}\s+from\s+"@\/lib\/balance";/s,
    "resubmitReport must import BMS balance helpers",
);
assert.match(
    resubmitSource,
    /const\s+hasBalanceImpact\s*=\s*hasBmsRepairItems\(itemsJson\);/,
    "resubmitReport must detect BMS repair items after rebuilding item JSON",
);
assert.match(
    resubmitSource,
    /await\s+validateEstimationLimit\(\s*user\.NIK,\s*data\.totalEstimation\s*\|\|\s*0\s*\)/s,
    "resubmitReport must validate revised estimation amount against available balance",
);
assert.match(
    resubmitSource,
    /balancePeriodId:\s*activePeriodId,/,
    "resubmitReport must persist balancePeriodId when needed",
);
```

Ensure the final line remains:

```ts
console.log("BMS balance server guard assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"
```

Expected: FAIL with `resubmitReport must import BMS balance helpers`.

- [ ] **Step 3: Add balance helper imports to `resubmit.ts`**

Add this import below the existing local imports:

```ts
import {
    createNewBmsPeriod,
    getBmsActivePeriod,
    hasBmsRepairItems,
    validateEstimationLimit,
} from "@/lib/balance";
```

- [ ] **Step 4: Include `balancePeriodId` in the existing report lookup**

Change the `select` in `prisma.report.findUnique` from:

```ts
            select: { createdByNIK: true, status: true, items: true },
```

to:

```ts
            select: {
                createdByNIK: true,
                status: true,
                items: true,
                balancePeriodId: true,
            },
```

- [ ] **Step 5: Add balance validation after JSON rebuild**

Immediately after:

```ts
        const itemsJson = buildItemsJson(data);
        const estimationsJson = buildEstimationsJson(data);
```

add:

```ts
        const hasBalanceImpact = hasBmsRepairItems(itemsJson);
        let activePeriodId = report.balancePeriodId;

        if (
            hasBalanceImpact &&
            currentStatus === "ESTIMATION_REJECTED_REVISION"
        ) {
            const balanceError = await validateEstimationLimit(
                user.NIK,
                data.totalEstimation || 0,
            );
            if (balanceError) {
                return { error: balanceError };
            }

            if (!activePeriodId) {
                const period = await getBmsActivePeriod(user.NIK);
                if (!period) {
                    const newPeriod = await createNewBmsPeriod(user.NIK);
                    activePeriodId = newPeriod.id;
                } else {
                    activePeriodId = period.id;
                }
            }
        }
```

Rationale: only estimation revision changes the estimate reserve. Work-review revision resubmits actual work to `PENDING_REVIEW` and should not run estimation-limit validation here.

- [ ] **Step 6: Persist `balancePeriodId` in the report update**

Inside `tx.report.update({ data: { ... } })`, add `balancePeriodId: activePeriodId,` after `estimations: estimationsJson,`:

```ts
                    items: itemsJson,
                    estimations: estimationsJson,
                    balancePeriodId: activePeriodId,
```

- [ ] **Step 7: Run focused regression test**

Run:

```powershell
node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"
```

Expected: PASS and prints `BMS balance server guard assertions passed`.

- [ ] **Step 8: Run focused type check**

Run:

```powershell
node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false --esModuleInterop true app/reports/actions/resubmit.ts app/reports/actions/bms-balance-guards.spec.ts
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 9: Commit task 2**

```powershell
git add -- app/reports/actions/resubmit.ts app/reports/actions/bms-balance-guards.spec.ts
git commit -m "fix: validate bms resubmit balance"
```

---

### Task 3: Final Verification and Task Note

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-bms-balance-risk-fixes.md`
- Modify: `docs/project/10-bms-weekly-balance.md` only if the implementation changes the permanent documented behavior.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 changes.
- Produces: final verification evidence and required project task note.

- [ ] **Step 1: Run focused specs for BMS balance and PJUM policy**

Run:

```powershell
node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts'); require('./lib/pjum-hanging.spec.ts'); require('./lib/bms-balance-calculation.spec.ts'); require('./lib/bms-active-report-blocker.spec.ts'); require('./lib/bms-cutover-audit.spec.ts'); require('./lib/pjum-selection-policy.spec.ts');"
```

Expected output includes:

```text
BMS balance server guard assertions passed
PJUM hanging classification assertions passed
BMS balance breakdown assertions passed
BMS cutover audit assertions passed
PJUM selection policy assertions passed
```

- [ ] **Step 2: Run full project build or type check**

Prefer full build:

```powershell
npm run build
```

Expected: PASS.

If build is too slow or blocked by environment-only issues, run:

```powershell
node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false
```

Expected: PASS, or document the exact unrelated blocker in the task note.

- [ ] **Step 3: Create required agent note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-bms-balance-risk-fixes.md` using Asia/Jakarta time with this structure:

```md
# BMS Balance Risk Fixes

## Scope

Closed server-side enforcement gaps for BMS balance lock and estimation resubmit validation.

## Context and Sources

- `AI_RULES.md`
- `AI_CONTEXT.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/agent-notes/2026-09-07-1130-update-bms-balance-cutover.md`
- `app/reports/actions/start-work-with-photos.ts`
- `app/reports/actions/resubmit.ts`

## Changed Files

- `app/reports/actions/start-work-with-photos.ts`: Added PJUM lock guard before photo start-work can transition a report to `IN_PROGRESS`.
- `app/reports/actions/resubmit.ts`: Added balance validation and period attachment for estimation revision resubmits.
- `app/reports/actions/bms-balance-guards.spec.ts`: Added regression coverage for both server guards.

## Decisions

- Reused existing balance helpers instead of adding a new service.
- Limited resubmit balance validation to `ESTIMATION_REJECTED_REVISION` because `REVIEW_REJECTED_REVISION` resubmits work realization, not a new estimation reserve.

## Verification

- `node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts'); require('./lib/pjum-hanging.spec.ts'); require('./lib/bms-balance-calculation.spec.ts'); require('./lib/bms-active-report-blocker.spec.ts'); require('./lib/bms-cutover-audit.spec.ts'); require('./lib/pjum-selection-policy.spec.ts');"`: PASS.
- `npm run build`: PASS.

## Remaining Work and Risks

None.
```

- [ ] **Step 4: Check final diff**

Run:

```powershell
git diff -- app/reports/actions/start-work-with-photos.ts app/reports/actions/resubmit.ts app/reports/actions/bms-balance-guards.spec.ts docs/agent-notes
```

Expected: Diff only contains the two guard fixes, focused regression spec, and the task note.

- [ ] **Step 5: Commit final note and any docs update**

```powershell
git add -- docs/agent-notes app/reports/actions/start-work-with-photos.ts app/reports/actions/resubmit.ts app/reports/actions/bms-balance-guards.spec.ts
git commit -m "docs: record bms balance risk fixes"
```

---

## Self-Review

**Spec coverage:** Task 1 covers the `startWorkWithPhotos` PJUM lock bypass. Task 2 covers estimation resubmit balance validation and `balancePeriodId` persistence. Task 3 covers verification and the project-required task note.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or vague edge-case placeholders remain. Each code-changing step includes exact code or exact insertion instructions.

**Type consistency:** Helper names match `lib/balance.ts`: `isBmsLockedByPjum`, `validateEstimationLimit`, `getBmsActivePeriod`, `createNewBmsPeriod`, and `hasBmsRepairItems`. Status names match Prisma report statuses currently used by the actions.
