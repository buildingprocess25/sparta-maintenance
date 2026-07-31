# BMC Store Cabang Lama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow BMC to optionally choose a legacy area as **Cabang Lama** for a store while keeping `Store.branchName` canonical.

**Architecture:** A small shared pure helper normalizes and groups existing `Store.areaName` values by canonical branch. The BMC page passes that map to the existing table and dialog; server actions independently authorize and validate the submitted branch-area pair before storing `areaName`.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma/PostgreSQL, shadcn/ui, Node assert-based focused checks.

## Global Constraints

- Do not add a schema migration, database mutation script, master-area table, or dependency.
- `Store.branchName` remains the canonical branch; the optional legacy value is `Store.areaName`.
- Label the optional field exactly **Cabang Lama**.
- Show the field only when the selected canonical branch has one or more legacy-area options.
- The field must be a dropdown; it must not accept free-text input.
- Validate the branch-area pair in the server action; do not trust the client map.
- Preserve an edited store's existing orphaned `areaName` as an option only in that store's edit dialog.
- Do not change the XLSX import format or infer/correct historical branch mappings.
- Use existing shadcn `Select`, `Label`, `Dialog`, and layout wrappers; do not add manual spacing inside shadcn components.
- Create a dated Asia/Jakarta task note before the final commit and never use `git commit --no-verify`.

---

## File Structure

- Create: `app/bmc/database/store-area-options.ts` — shared pure normalization, grouping, and edit-option helpers.
- Create: `app/bmc/database/store-area-options.spec.ts` — focused Node assertions for the shared helper.
- Modify: `app/bmc/database/queries.ts` — fetch distinct non-null stored area values for authorized canonical branches.
- Modify: `app/bmc/database/page.tsx` — load and pass `areaNamesByBranch`.
- Modify: `app/bmc/database/_components/store-table.tsx` — include `areaName` in row data and forward the map.
- Modify: `app/bmc/database/_components/store-form-dialog.tsx` — render and submit the dependent optional dropdown.
- Modify: `app/bmc/database/actions.ts` — normalize, authorize, and validate `areaName` in create/update operations.
- Create: `app/bmc/database/store-area-contract.spec.ts` — source-level assertions for server enforcement and form wiring.
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-add-bmc-store-legacy-area.md` — implementation evidence record.

### Task 1: Share the legacy-area option rules

**Files:**

- Create: `app/bmc/database/store-area-options.ts`
- Create: `app/bmc/database/store-area-options.spec.ts`

**Interfaces:**

- Consumes: rows shaped as `{ branchName: string; areaName: string | null }`.
- Produces: `groupAreaNamesByBranch(branchNames, rows): Record<string, string[]>`.
- Produces: `getStoreAreaOptions(areaNamesByBranch, branchName, currentAreaName?): string[]`, used by the form and action validation.

- [ ] **Step 1: Write the failing helper assertions**

Create `app/bmc/database/store-area-options.spec.ts`:

~~~ts
import assert from "node:assert/strict";
import {
    getStoreAreaOptions,
    groupAreaNamesByBranch,
} from "./store-area-options";

const areas = groupAreaNamesByBranch(
    ["JAKARTA", "BANDUNG"],
    [
        { branchName: "JAKARTA", areaName: "  JAKSEL  " },
        { branchName: "JAKARTA", areaName: "JAKSEL" },
        { branchName: "JAKARTA", areaName: "JAKBAR" },
        { branchName: "BANDUNG", areaName: null },
        { branchName: "UNKNOWN", areaName: "IGNORED" },
    ],
);

assert.deepEqual(areas, {
    JAKARTA: ["JAKBAR", "JAKSEL"],
    BANDUNG: [],
});
assert.deepEqual(getStoreAreaOptions(areas, "BANDUNG"), []);
assert.deepEqual(
    getStoreAreaOptions(areas, "JAKARTA", "ORPHAN AREA"),
    ["JAKBAR", "JAKSEL", "ORPHAN AREA"],
);

console.log("store area option assertions passed");
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-options.spec.ts'
~~~

Expected: FAIL because `./store-area-options` does not exist.

- [ ] **Step 3: Implement the shared helper**

Create `app/bmc/database/store-area-options.ts`:

~~~ts
export type StoreAreaRow = {
    branchName: string;
    areaName: string | null;
};

export type AreaNamesByBranch = Record<string, string[]>;

function normalizeAreaName(areaName: string | null | undefined) {
    const value = areaName?.trim();
    return value || null;
}

export function groupAreaNamesByBranch(
    branchNames: string[],
    rows: StoreAreaRow[],
): AreaNamesByBranch {
    const allowedBranches = new Set(branchNames);
    const grouped = new Map(
        branchNames.map((branchName) => [branchName, new Set<string>()]),
    );

    for (const row of rows) {
        const areaName = normalizeAreaName(row.areaName);
        if (!areaName || !allowedBranches.has(row.branchName)) continue;
        grouped.get(row.branchName)?.add(areaName);
    }

    return Object.fromEntries(
        branchNames.map((branchName) => [
            branchName,
            Array.from(grouped.get(branchName) ?? []).sort((a, b) =>
                a.localeCompare(b, "id"),
            ),
        ]),
    );
}

export function getStoreAreaOptions(
    areaNamesByBranch: AreaNamesByBranch,
    branchName: string,
    currentAreaName?: string | null,
) {
    const current = normalizeAreaName(currentAreaName);
    return Array.from(
        new Set([
            ...(areaNamesByBranch[branchName] ?? []),
            ...(current ? [current] : []),
        ]),
    ).sort((a, b) => a.localeCompare(b, "id"));
}

export { normalizeAreaName };
~~~

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-options.spec.ts'
~~~

Expected: `store area option assertions passed`.

- [ ] **Step 5: Commit the self-contained helper**

~~~powershell
git add 'app/bmc/database/store-area-options.ts' 'app/bmc/database/store-area-options.spec.ts'
git commit -m "feat(bmc): group legacy store areas"
~~~

### Task 2: Load and enforce branch-specific legacy areas

**Files:**

- Modify: `app/bmc/database/queries.ts`
- Modify: `app/bmc/database/actions.ts`
- Create: `app/bmc/database/store-area-contract.spec.ts`

**Interfaces:**

- Consumes: `getStoreAreaNamesByBranches(branchNames: string[]): Promise<AreaNamesByBranch>`.
- Consumes: `StorePayload.areaName?: string | null`.
- Produces: create/update results that reject a non-null `areaName` not belonging to the authorized canonical branch.
- Produces: normalized `areaName: null` for omitted, empty, or whitespace-only selections.

- [ ] **Step 1: Write the failing server-contract assertions**

Create `app/bmc/database/store-area-contract.spec.ts`:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

assert.match(queries, /export async function getStoreAreaNamesByBranches/);
assert.match(queries, /areaName:s*{s*not:s*nulls*}/);
assert.match(actions, /areaName??:s*strings*|s*null/);
assert.match(actions, /getStoreAreaOptions/);
assert.match(actions, /Cabang lama tidak valid untuk cabang ini/);
assert.match(actions, /areaName:s*normalizedAreaName/);

console.log("store area contract assertions passed");
~~~

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-contract.spec.ts'
~~~

Expected: FAIL because the query and action contract do not exist.

- [ ] **Step 3: Add the query and extend the selected store row**

In `app/bmc/database/queries.ts`, import `AreaNamesByBranch` and `groupAreaNamesByBranch`, add the following query, and include `areaName: true` in the existing `getStoresByBranches` select:

~~~ts
export async function getStoreAreaNamesByBranches(
    branchNames: string[],
): Promise<AreaNamesByBranch> {
    if (branchNames.length === 0) return {};

    const rows = await prisma.store.findMany({
        where: {
            branchName: { in: branchNames },
            areaName: { not: null },
        },
        select: {
            branchName: true,
            areaName: true,
        },
    });

    return groupAreaNamesByBranch(branchNames, rows);
}
~~~

- [ ] **Step 4: Add server validation before create and update writes**

In `app/bmc/database/actions.ts`:

1. Import `getStoreAreaNamesByBranches` and `getStoreAreaOptions`.
2. Extend `StorePayload`:

~~~ts
type StorePayload = {
    code: string;
    name: string;
    branchName: string;
    areaName?: string | null;
    isActive?: boolean;
};
~~~

3. Add a local validation helper:

~~~ts
async function resolveStoreAreaName(
    branchName: string,
    areaName: string | null | undefined,
    currentAreaName?: string | null,
) {
    const normalizedAreaName = areaName?.trim() || null;
    if (!normalizedAreaName) return { areaName: null };

    const areaNamesByBranch = await getStoreAreaNamesByBranches([branchName]);
    const options = getStoreAreaOptions(
        areaNamesByBranch,
        branchName,
        currentAreaName,
    );

    if (!options.includes(normalizedAreaName)) {
        return { error: "Cabang lama tidak valid untuk cabang ini" };
    }

    return { areaName: normalizedAreaName };
}
~~~

4. After the existing `user.branchNames.includes(payload.branchName)` check in `createStore`, call `resolveStoreAreaName(payload.branchName, payload.areaName)`; return its error and write `areaName: normalizedAreaName` rather than spreading an untrusted input.

5. In `updateStore`, fetch the existing store with `branchName` and `areaName` before the update. Reject a payload whose `branchName` differs from the stored branch with `"Cabang toko tidak dapat diubah"`. Authorize the stored branch, call `resolveStoreAreaName(existing.branchName, payload.areaName, existing.areaName)`, and write the normalized value. This permits an orphaned existing value only when it remains unchanged.

- [ ] **Step 5: Run server-contract and helper checks**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-options.spec.ts'
npx tsx 'app/bmc/database/store-area-contract.spec.ts'
~~~

Expected: both commands print their respective `assertions passed` messages.

- [ ] **Step 6: Commit server data flow**

~~~powershell
git add 'app/bmc/database/queries.ts' 'app/bmc/database/actions.ts' 'app/bmc/database/store-area-contract.spec.ts'
git commit -m "feat(bmc): validate store legacy area"
~~~

### Task 3: Wire the optional Cabang Lama dropdown into BMC Store forms

**Files:**

- Modify: `app/bmc/database/page.tsx`
- Modify: `app/bmc/database/_components/store-table.tsx`
- Modify: `app/bmc/database/_components/store-form-dialog.tsx`
- Modify: `app/bmc/database/store-area-contract.spec.ts`

**Interfaces:**

- Consumes: `areaNamesByBranch: AreaNamesByBranch` loaded by the server page.
- Consumes: `getStoreAreaOptions(areaNamesByBranch, branch, editStore?.areaName)`.
- Produces: create/update payloads with `areaName: string | null`.

- [ ] **Step 1: Extend the UI contract test before editing the components**

Append these assertions to `app/bmc/database/store-area-contract.spec.ts`:

~~~ts
const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const table = readFileSync(
    new URL("./_components/store-table.tsx", import.meta.url),
    "utf8",
);
const dialog = readFileSync(
    new URL("./_components/store-form-dialog.tsx", import.meta.url),
    "utf8",
);

assert.match(page, /getStoreAreaNamesByBranches/);
assert.match(page, /areaNamesByBranch={areaNamesByBranch}/);
assert.match(table, /areaName:s*strings*|s*null/);
assert.match(table, /areaNamesByBranch/);
assert.match(dialog, /Cabang Lama/);
assert.match(dialog, /getStoreAreaOptions/);
assert.match(dialog, /setAreaName(null)/);
assert.match(dialog, /areaName,/);
console.log("store area UI assertions passed");
~~~

- [ ] **Step 2: Run the UI contract test to verify it fails**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-contract.spec.ts'
~~~

Expected: FAIL because the page, table, and dialog are not wired to the area map.

- [ ] **Step 3: Load and pass the area map from the server page**

In `app/bmc/database/page.tsx`, import `getStoreAreaNamesByBranches`, include it in the existing `Promise.all`, and pass the result to `StoreTable`:

~~~ts
const [usersResult, storesResult, areaNamesByBranch] = await Promise.all([
    getUsersByBranches(user.branchNames, {
        page: userPage,
        limit: 10,
        search: resolvedSearchParams.uSearch,
        role: resolvedSearchParams.uRole,
    }),
    getStoresByBranches(user.branchNames, {
        page: storePage,
        limit: 10,
        search: resolvedSearchParams.sSearch,
        status: resolvedSearchParams.status,
    }),
    getStoreAreaNamesByBranches(user.branchNames),
]);

<StoreTable
    stores={storesResult.stores}
    branchNames={user.branchNames}
    areaNamesByBranch={areaNamesByBranch}
    totalCount={storesResult.total}
    currentPage={storesResult.page}
    totalPages={storesResult.totalPages}
    searchParams={{
        sSearch: resolvedSearchParams.sSearch,
        status: resolvedSearchParams.status,
    }}
/>
~~~

- [ ] **Step 4: Forward the data through StoreTable**

In `app/bmc/database/_components/store-table.tsx`:

1. Import the `AreaNamesByBranch` type.
2. Add `areaName: string | null` to `StoreRow`.
3. Add `areaNamesByBranch: AreaNamesByBranch` to `Props` and destructure it.
4. Pass `areaNamesByBranch` to both `StoreFormDialog` usages.

~~~tsx
<StoreFormDialog
    branchNames={branchNames}
    areaNamesByBranch={areaNamesByBranch}
/>

<StoreFormDialog
    branchNames={branchNames}
    areaNamesByBranch={areaNamesByBranch}
    editStore={store}
    trigger={
        <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
            <Pencil className="h-4 w-4" />
        </Button>
    }
/>
~~~

- [ ] **Step 5: Add the dependent optional select to StoreFormDialog**

In `app/bmc/database/_components/store-form-dialog.tsx`:

1. Import `AreaNamesByBranch` and `getStoreAreaOptions`.
2. Extend `StoreRow` and props with the same `areaName` fields used by `StoreTable`.
3. Add state and derive options:

~~~ts
const [areaName, setAreaName] = useState<string | null>(
    editStore?.areaName ?? null,
);
const areaOptions = getStoreAreaOptions(
    areaNamesByBranch,
    branch,
    editStore?.areaName,
);
~~~

4. In the canonical branch select, replace `onValueChange={setBranch}` with:

~~~ts
onValueChange={(value) => {
    setBranch(value);
    setAreaName(null);
}}
~~~

5. In `resetForm`, reset `areaName` to `null`.
6. Directly after the canonical branch selector block, render this only when `areaOptions.length > 0`:

~~~tsx
<div className="space-y-2">
    <Label htmlFor="store-legacy-area">Cabang Lama</Label>
    <Select
        value={areaName ?? "__none__"}
        onValueChange={(value) =>
            setAreaName(value === "__none__" ? null : value)
        }
    >
        <SelectTrigger id="store-legacy-area">
            <SelectValue placeholder="Pilih cabang lama (opsional)" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="__none__">Tidak ada</SelectItem>
            {areaOptions.map((option) => (
                <SelectItem key={option} value={option}>
                    {option}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
</div>
~~~

7. Include `areaName` in both create and update payloads. Keep existing code/name/status behavior unchanged.

- [ ] **Step 6: Run focused UI and contract checks**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-options.spec.ts'
npx tsx 'app/bmc/database/store-area-contract.spec.ts'
npx eslint 'app/bmc/database/page.tsx' 'app/bmc/database/queries.ts' 'app/bmc/database/actions.ts' 'app/bmc/database/_components/store-table.tsx' 'app/bmc/database/_components/store-form-dialog.tsx' 'app/bmc/database/store-area-options.ts' 'app/bmc/database/store-area-options.spec.ts' 'app/bmc/database/store-area-contract.spec.ts'
~~~

Expected: the two assertion commands pass and ESLint exits with code 0.

- [ ] **Step 7: Commit the BMC form**

~~~powershell
git add 'app/bmc/database/page.tsx' 'app/bmc/database/_components/store-table.tsx' 'app/bmc/database/_components/store-form-dialog.tsx' 'app/bmc/database/store-area-contract.spec.ts'
git commit -m "feat(bmc): select store legacy branch"
~~~

### Task 4: Final verification and handoff

**Files:**

- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-add-bmc-store-legacy-area.md`

**Interfaces:**

- Consumes: completed Tasks 1–3.
- Produces: a verified implementation record; no migration and no production data change.

- [ ] **Step 1: Create the dated task note**

Copy `docs/agent-notes/TEMPLATE.md` to a new Asia/Jakarta-dated file. Record the exact changed files, branch-area validation decision, commands run, and that XLSX import plus data remediation are deferred. Do not include store records, credentials, or raw database output.

- [ ] **Step 2: Run complete focused verification**

Run:

~~~powershell
npx tsx 'app/bmc/database/store-area-options.spec.ts'
npx tsx 'app/bmc/database/store-area-contract.spec.ts'
npm run test:agent-note
git diff --check
git status --short
~~~

Expected: both assertion commands and `agent task note assertions passed` succeed, `git diff --check` has no output, and status lists only the intended uncommitted implementation files before staging.

- [ ] **Step 3: Perform manual local acceptance checks**

1. Sign in as a BMC with a branch that has saved legacy areas. Open **Manajemen Toko** and click **Tambah Toko**.
2. Confirm **Cabang Lama** appears only after a canonical branch with options is selected; choose an option and save.
3. Confirm the saved store retains the selected canonical branch and legacy area.
4. Open a branch with no legacy areas; confirm **Cabang Lama** is absent and the create form still saves.
5. Edit a store with a legacy area; confirm it is preselected, can be cleared, and can be changed only to an option belonging to that canonical branch.
6. Submit a stale or forged cross-branch area through browser DevTools; confirm the server returns `Cabang lama tidak valid untuk cabang ini`.
7. Confirm XLSX import remains unchanged and no database migration command is run.

- [ ] **Step 4: Commit the task record**

~~~powershell
git add 'docs/agent-notes/YYYY-MM-DD-HHMM-add-bmc-store-legacy-area.md'
git commit -m "docs: record legacy area verification"
~~~

## Plan Self-Review

- Spec coverage: Tasks 1–3 cover dependent options, create/edit behavior, orphan preservation, canonical branch integrity, and server validation. Task 4 covers manual acceptance, task-note governance, and explicit deferrals.
- No migration, historical cleanup, import format change, new dependency, or automatic mapping is included.
- Type consistency: `AreaNamesByBranch`, `getStoreAreaOptions`, and optional `areaName` are defined before every consuming task.

