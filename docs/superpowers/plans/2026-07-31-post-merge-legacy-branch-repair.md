# Post-Merge Legacy Branch Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair post-merge Stores, Reports, and PJUM with legacy branch names and reject new BMC store writes/imports using those names.

**Architecture:** Put the approved eight-entry mapping in a pure shared helper. BMC write paths use that helper to reject a legacy input, while the script adds an explicit repair mode that reads only currently incorrect rows and writes their mapped canonical branch plus a safe area fallback.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, shadcn/ui, Node assert checks, tsx.

## Global Constraints

- No Prisma migration, schema change, dependency, automatic user-scope conversion, or production write during implementation.
- The approved mapping is the only canonicalization source.
- Never silently remap a BMC request; reject it with the mapped canonical branch and Cabang Lama instruction.
- Repair only rows whose current `branchName` is a legacy name.
- Preserve non-empty `areaName`; fallback to the original legacy branch only when area is empty.
- `--repair-post-merge --execute` is the sole data-writing command and needs separate production approval after a dry run.
- Create a dated Asia/Jakarta task note and do not use `git commit --no-verify`.

---

## File Structure

- Create: `lib/branch-merges.ts` — approved mapping and pure branch guard helpers.
- Create: `lib/branch-merges.spec.ts` — mapping/guard assertions.
- Modify: `scripts/merge-branch-scopes.ts` — import shared mapping and add explicit post-merge repair mode.
- Modify: `scripts/merge-branch-scopes.spec.ts` — script-source assertions for safe repair mode.
- Modify: `app/bmc/database/actions.ts` — reject legacy direct/create/update/import branch input.
- Modify: `app/bmc/database/_components/store-table.tsx` — pass only canonical writable branches to write dialogs.
- Modify: `app/bmc/database/_components/store-form-dialog.tsx` — disable creation when no writable canonical branch remains.
- Modify: `app/bmc/database/_components/import-store-dialog.tsx` — disable import when no writable canonical branch remains.
- Create: `app/bmc/database/legacy-branch-write-guard.spec.ts` — action and UI wiring assertions.
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-repair-post-merge-legacy-branches.md` — implementation evidence.

### Task 1: Extract and test the approved branch mapping

**Files:**

- Create: `lib/branch-merges.ts`
- Create: `lib/branch-merges.spec.ts`

**Interfaces:**

- Produces: `LEGACY_BRANCH_MERGES: ReadonlyMap<string, string>`.
- Produces: `getCanonicalBranchName(branchName: string): string`.
- Produces: `getLegacyBranchMessage(branchName: string): string | null`.
- Produces: `getWritableBranchNames(branchNames: string[]): string[]`.

- [ ] **Step 1: Write failing mapping assertions**

Create `lib/branch-merges.spec.ts`:

~~~ts
import assert from "node:assert/strict";
import {
    getCanonicalBranchName,
    getLegacyBranchMessage,
    getWritableBranchNames,
} from "./branch-merges";

assert.equal(getCanonicalBranchName("KARAWANG"), "CILEUNGSI RAYA");
assert.equal(getCanonicalBranchName(" CIKOKOL "), "CIKOKOL RAYA");
assert.equal(getCanonicalBranchName("PEKANBARU"), "PEKANBARU");
assert.match(
    getLegacyBranchMessage("KARAWANG") ?? "",
    /CILEUNGSI RAYA.*Cabang Lama/,
);
assert.equal(getLegacyBranchMessage("PEKANBARU"), null);
assert.deepEqual(
    getWritableBranchNames(["KARAWANG", "CIKOKOL RAYA", "CIKOKOL RAYA"]),
    ["CIKOKOL RAYA"],
);

console.log("branch merge assertions passed");
~~~

- [ ] **Step 2: Verify RED**

Run:

~~~powershell
npx tsx 'lib/branch-merges.spec.ts'
~~~

Expected: FAIL because `./branch-merges` does not exist.

- [ ] **Step 3: Implement the mapping helper**

Create `lib/branch-merges.ts`:

~~~ts
export const LEGACY_BRANCH_MERGES = new Map<string, string>([
    ["BOGOR", "CILEUNGSI RAYA"],
    ["BEKASI", "CILEUNGSI RAYA"],
    ["KARAWANG", "CILEUNGSI RAYA"],
    ["CILEUNGSI 2", "CILEUNGSI RAYA"],
    ["BALARAJA", "CIKOKOL RAYA"],
    ["SERANG", "CIKOKOL RAYA"],
    ["PARUNG", "CIKOKOL RAYA"],
    ["CIKOKOL", "CIKOKOL RAYA"],
]);

function normalizeBranchName(branchName: string) {
    return branchName.trim();
}

export function getCanonicalBranchName(branchName: string) {
    const normalized = normalizeBranchName(branchName);
    return LEGACY_BRANCH_MERGES.get(normalized) ?? normalized;
}

export function getLegacyBranchMessage(branchName: string) {
    const normalized = normalizeBranchName(branchName);
    const canonical = LEGACY_BRANCH_MERGES.get(normalized);
    if (!canonical) return null;

    return `Cabang ${normalized} sudah digabung ke ${canonical}. Pilih ${canonical}, lalu isi Cabang Lama.`;
}

export function getWritableBranchNames(branchNames: string[]) {
    return [
        ...new Set(
            branchNames
                .map(normalizeBranchName)
                .filter((branchName) => branchName.length > 0)
                .filter((branchName) => !LEGACY_BRANCH_MERGES.has(branchName)),
        ),
    ];
}
~~~

- [ ] **Step 4: Verify GREEN**

Run:

~~~powershell
npx tsx 'lib/branch-merges.spec.ts'
~~~

Expected: `branch merge assertions passed`.

- [ ] **Step 5: Commit**

~~~powershell
git add 'lib/branch-merges.ts' 'lib/branch-merges.spec.ts'
git commit -m "refactor: share branch merge mapping"
~~~

### Task 2: Reject legacy branch store writes and hide unsafe write options

**Files:**

- Modify: `app/bmc/database/actions.ts`
- Modify: `app/bmc/database/_components/store-table.tsx`
- Modify: `app/bmc/database/_components/store-form-dialog.tsx`
- Modify: `app/bmc/database/_components/import-store-dialog.tsx`
- Create: `app/bmc/database/legacy-branch-write-guard.spec.ts`

**Interfaces:**

- Consumes: `getLegacyBranchMessage(branchName)` and `getWritableBranchNames(branchNames)`.
- Produces: direct create/update/import failures for legacy branch values before Prisma writes.
- Produces: disabled write controls with `Tidak ada cabang utama yang dapat dikelola` when all assigned branches are legacy values.

- [ ] **Step 1: Write failing guard assertions**

Create `app/bmc/database/legacy-branch-write-guard.spec.ts`:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const table = readFileSync(
    new URL("./_components/store-table.tsx", import.meta.url),
    "utf8",
);
const form = readFileSync(
    new URL("./_components/store-form-dialog.tsx", import.meta.url),
    "utf8",
);
const importDialog = readFileSync(
    new URL("./_components/import-store-dialog.tsx", import.meta.url),
    "utf8",
);

assert.match(actions, /getLegacyBranchMessage/);
assert.match(actions, /const legacyBranchMessage = getLegacyBranchMessage/);
assert.match(actions, /importStores/);
assert.match(table, /getWritableBranchNames/);
assert.match(form, /Tidak ada cabang utama yang dapat dikelola/);
assert.match(importDialog, /Tidak ada cabang utama yang dapat dikelola/);

console.log("legacy branch write guard assertions passed");
~~~

- [ ] **Step 2: Verify RED**

Run:

~~~powershell
npx tsx 'app/bmc/database/legacy-branch-write-guard.spec.ts'
~~~

Expected: FAIL because the guard is not wired to write paths.

- [ ] **Step 3: Add the action guard**

In `app/bmc/database/actions.ts`, import `getLegacyBranchMessage` and add:

~~~ts
function getLegacyStoreBranchError(branchName: string) {
    return getLegacyBranchMessage(branchName);
}
~~~

Call it in `createStore` before `requireRole`, in `updateStore` before the existing-store lookup, and in `importStores` immediately after reading `targetBranch`:

~~~ts
const legacyBranchMessage = getLegacyStoreBranchError(payload.branchName);
if (legacyBranchMessage) return { error: legacyBranchMessage };
~~~

For import, return:

~~~ts
return { ...result, errors: [legacyBranchMessage] };
~~~

Do not map input branch values here. Keep the existing scope authorization and malformed-target checks afterward.

- [ ] **Step 4: Filter writable branches and disable empty write flows**

In `app/bmc/database/_components/store-table.tsx`, derive:

~~~ts
const writableBranchNames = getWritableBranchNames(branchNames);
~~~

Pass `writableBranchNames` to `StoreFormDialog` and `ImportStoreDialog`.

In both dialog components, add:

~~~ts
const hasWritableBranch = branchNames.length > 0;
~~~

Disable the trigger button when false and set a title attribute:

~~~tsx
disabled={!hasWritableBranch}
title={
    hasWritableBranch
        ? undefined
        : "Tidak ada cabang utama yang dapat dikelola"
}
~~~

Keep the existing single/multiple branch selector behavior, now driven by writable branches only. The import button must also disable its submit button when `!hasWritableBranch`.

- [ ] **Step 5: Verify GREEN**

Run:

~~~powershell
npx tsx 'app/bmc/database/legacy-branch-write-guard.spec.ts'
npx eslint 'app/bmc/database/actions.ts' 'app/bmc/database/_components/store-table.tsx' 'app/bmc/database/_components/store-form-dialog.tsx' 'app/bmc/database/_components/import-store-dialog.tsx' 'lib/branch-merges.ts'
~~~

Expected: assertions pass and ESLint exits with code 0.

- [ ] **Step 6: Commit**

~~~powershell
git add 'app/bmc/database/actions.ts' 'app/bmc/database/_components/store-table.tsx' 'app/bmc/database/_components/store-form-dialog.tsx' 'app/bmc/database/_components/import-store-dialog.tsx' 'app/bmc/database/legacy-branch-write-guard.spec.ts'
git commit -m "fix(bmc): reject legacy store branches"
~~~

### Task 3: Add the explicit post-merge repair mode

**Files:**

- Modify: `scripts/merge-branch-scopes.ts`
- Create: `scripts/merge-branch-scopes.spec.ts`

**Interfaces:**

- Consumes: `LEGACY_BRANCH_MERGES`.
- Produces: `--repair-post-merge` dry-run aggregate counts.
- Produces: `--repair-post-merge --execute` repair of only currently legacy Store, Report, and PJUM rows.

- [ ] **Step 1: Write failing script assertions**

Create `scripts/merge-branch-scopes.spec.ts`:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(
    new URL("./merge-branch-scopes.ts", import.meta.url),
    "utf8",
);

assert.match(script, /--repair-post-merge/);
assert.match(script, /LEGACY_BRANCH_MERGES/);
assert.match(script, /areaName: store.areaName \|\| oldBranchName/);
assert.match(script, /areaName: report.areaName \|\| oldBranchName/);
assert.match(script, /Repair post-merge requires --execute/);

console.log("merge branch repair assertions passed");
~~~

- [ ] **Step 2: Verify RED**

Run:

~~~powershell
npx tsx 'scripts/merge-branch-scopes.spec.ts'
~~~

Expected: FAIL because repair mode is absent.

- [ ] **Step 3: Implement bounded repair mode**

In `scripts/merge-branch-scopes.ts`:

1. Import `LEGACY_BRANCH_MERGES` and derive `OLD_BRANCHES` from it.
2. Add `const repairPostMerge = process.argv.includes("--repair-post-merge");`.
3. Before parsing either backup CSV, branch to `repairPostMergeEntries(execute)` when the flag is set.
4. Add this function:

~~~ts
async function repairPostMergeEntries(execute: boolean) {
    const oldBranchNames = [...LEGACY_BRANCH_MERGES.keys()];
    const [stores, reports, pjumExports] = await Promise.all([
        prisma.store.findMany({
            where: { branchName: { in: oldBranchNames } },
            select: { code: true, branchName: true, areaName: true },
        }),
        prisma.report.findMany({
            where: { branchName: { in: oldBranchNames } },
            select: { reportNumber: true, branchName: true, areaName: true },
        }),
        prisma.pjumExport.findMany({
            where: { branchName: { in: oldBranchNames } },
            select: { id: true, branchName: true },
        }),
    ]);

    console.log(execute ? "Mode: REPAIR EXECUTE" : "Mode: REPAIR DRY RUN");
    console.log(`Stores to repair: ${stores.length}`);
    console.log(`Reports to repair: ${reports.length}`);
    console.log(`PJUM to repair   : ${pjumExports.length}`);

    if (!execute) {
        console.log("Jalankan dengan --repair-post-merge --execute untuk menyimpan perubahan.");
        return;
    }

    for (const store of stores) {
        const oldBranchName = store.branchName;
        await prisma.store.update({
            where: { code: store.code },
            data: {
                branchName: LEGACY_BRANCH_MERGES.get(oldBranchName)!,
                areaName: store.areaName || oldBranchName,
            },
        });
    }

    for (const report of reports) {
        const oldBranchName = report.branchName;
        await prisma.report.update({
            where: { reportNumber: report.reportNumber },
            data: {
                branchName: LEGACY_BRANCH_MERGES.get(oldBranchName)!,
                areaName: report.areaName || oldBranchName,
            },
        });
    }

    for (const pjumExport of pjumExports) {
        await prisma.pjumExport.update({
            where: { id: pjumExport.id },
            data: {
                branchName: LEGACY_BRANCH_MERGES.get(pjumExport.branchName)!,
            },
        });
    }

    await refreshPjumAreas();
    console.log("Repair post-merge selesai.");
}
~~~

5. Extract the current PJUM `areaNames` recalculation loop into `refreshPjumAreas()` and call it from both the original `--execute` branch and repair mode. Preserve its cursor pagination and no-change skip behavior.
6. Keep the original default dry-run and `--execute` behavior unchanged, including its backup CSV requirement.

- [ ] **Step 4: Verify GREEN**

Run:

~~~powershell
npx tsx 'scripts/merge-branch-scopes.spec.ts'
npx tsx 'scripts/merge-branch-scopes.ts' --self-test
npx eslint 'scripts/merge-branch-scopes.ts' 'scripts/merge-branch-scopes.spec.ts'
~~~

Expected: both assertion/self-test commands pass and ESLint exits with code 0.

- [ ] **Step 5: Commit**

~~~powershell
git add 'scripts/merge-branch-scopes.ts' 'scripts/merge-branch-scopes.spec.ts'
git commit -m "fix: repair post-merge legacy branches"
~~~

### Task 4: Final verification and production handoff

**Files:**

- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-repair-post-merge-legacy-branches.md`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: verified code plus a dry-run-only production handoff.

- [ ] **Step 1: Create task note**

Copy `docs/agent-notes/TEMPLATE.md` into the dated filename. Record exact files, the explicit repair flags, checks run, and that no production command was executed.

- [ ] **Step 2: Run complete verification**

Run:

~~~powershell
npx tsx 'lib/branch-merges.spec.ts'
npx tsx 'app/bmc/database/legacy-branch-write-guard.spec.ts'
npx tsx 'app/bmc/database/store-area-options.spec.ts'
npx tsx 'app/bmc/database/store-area-validation.spec.ts'
npx tsx 'scripts/merge-branch-scopes.spec.ts'
npx tsx 'scripts/merge-branch-scopes.ts' --self-test
npm run test:agent-note
npx tsc --noEmit
npm run build
git diff --check
~~~

Expected: all assertions, typecheck, and build pass; `git diff --check` has no output.

- [ ] **Step 3: Commit code and task note**

~~~powershell
git add -A
git commit -m "fix: guard and repair legacy branches"
~~~

- [ ] **Step 4: Production procedure (do not execute automatically)**

1. Deploy the committed application guard first.
2. Run only the dry run against the intended production datasource:

~~~powershell
npx tsx scripts/merge-branch-scopes.ts --repair-post-merge
~~~

3. Review aggregate counts and back up the production database.
4. Obtain explicit confirmation, then run:

~~~powershell
npx tsx scripts/merge-branch-scopes.ts --repair-post-merge --execute
~~~

5. Re-run the dry run and confirm all three repair counts are zero.

## Plan Self-Review

- Spec coverage: Task 1 centralizes the approved map; Task 2 covers direct, forged, and XLSX branch writes; Task 3 repairs only legacy content rows and refreshes PJUM areas; Task 4 preserves the production approval boundary.
- No migration, backup inference, silent remap, or automatic user-scope expansion is included.
- Type consistency: every consumer uses `LEGACY_BRANCH_MERGES`, `getLegacyBranchMessage`, and `getWritableBranchNames` defined in Task 1.
