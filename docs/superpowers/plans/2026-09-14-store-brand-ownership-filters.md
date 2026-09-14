# Store Brand Ownership Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Brand and Tipe Toko columns plus Brand and Tipe Toko filters to `/dashboard/stores`, using the existing store database fields.

**Architecture:** Keep the stores page server-filtered so search, branch, area, brand, ownership type, total count, and infinite scroll all use the same Prisma predicate. Reuse the existing shadcn `Select` filter pattern in `AdminStoresTable`; add only small local formatter helpers for display labels.

**Tech Stack:** Next.js App Router, React client components, Server Actions, Prisma, shadcn/ui `Select`, node:test source-level checks.

## Global Constraints

- Do not add a migration; `Store.brand` and `Store.ownershipType` already exist.
- `Brand` column reads `Store.brand` directly. Render `null`, `undefined`, or empty string as `-`.
- Brand filter options come from existing database brand values passed through `getAllBrands()`, excluding empty display values in the client.
- `Tipe Toko` column reads `Store.ownershipType` directly. Render `UNKNOWN` as `-`, `REGULAR` as `Regular`, and `FRANCHISE` as `Franchise`.
- Tipe toko filter is server-side and supports `REGULAR`, `FRANCHISE`, and `UNKNOWN`.
- Preserve existing filters: search, branch, and area must continue to work together with the new filters.
- Preserve existing ADMIN/BMC scope rules in `getAdminStores`.
- Use the existing stores filter bar style and shadcn/ui components.
- Update canonical UI docs and create a dated task note before finishing implementation.

---

## File Structure

- Modify `app/dashboard/stores/actions.ts`: extend filter type, include `ownershipType` in selected store fields, and add Prisma predicates for `brand` and `ownershipType`.
- Modify `app/dashboard/stores/page.tsx`: read `brand` and `type` URL params, pass them into the initial `getAdminStores()` request and into `AdminStoresTable`.
- Modify `app/dashboard/stores/_components/admin-stores-table.tsx`: add filter states, URL synchronization, dropdowns, table headers, table cells, display helpers, and updated `colSpan`.
- Create `app/dashboard/stores/actions.test.ts`: source-level regression checks for server-side brand and ownership filtering.
- Create `app/dashboard/stores/admin-stores-table.test.ts`: source-level regression checks for UI labels, URL params, filters, columns, and `UNKNOWN` display.
- Modify `docs/project/05-routes-and-ui.md`: document the stores table columns and filters.
- Create `docs/agent-notes/YYYY-MM-DD-HHMM-store-brand-ownership-filters.md`: task note from the repo template.

---

### Task 1: Server Store Filters

**Files:**
- Modify: `app/dashboard/stores/actions.ts`
- Test: `app/dashboard/stores/actions.test.ts`

**Interfaces:**
- Consumes: `Store.brand`, `Store.ownershipType`, `Prisma.StoreWhereInput`, current `AdminStoreFilters`.
- Produces: `AdminStoreFilters` with `brand?: string` and `ownershipType?: StoreOwnershipType`; `getAdminStores()` results that include `ownershipType`.

- [ ] **Step 1: Write the failing source-level test**

Create `app/dashboard/stores/actions.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
    "app/dashboard/stores/actions.ts",
    "utf8",
);

test("admin store filters include brand and ownership type", () => {
    assert.match(source, /import\s+\{\s*Prisma,\s*StoreOwnershipType\s*\}\s+from\s+"@prisma\/client"/);
    assert.match(source, /brand\?: string;/);
    assert.match(source, /ownershipType\?: StoreOwnershipType;/);
    assert.match(source, /where\.brand\s*=\s*\{\s*equals:\s*filters\.brand,\s*mode:\s*"insensitive"\s*\}/);
    assert.match(source, /where\.ownershipType\s*=\s*filters\.ownershipType/);
});

test("admin store list selects ownership type for the table", () => {
    assert.match(source, /ownershipType:\s*true/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"
```

Expected: FAIL because `AdminStoreFilters` does not yet include `brand` or `ownershipType`, and `ownershipType` is not selected.

- [ ] **Step 3: Implement server-side filter support**

In `app/dashboard/stores/actions.ts`, change the Prisma import:

```ts
import { Prisma, StoreOwnershipType } from "@prisma/client";
```

Replace `AdminStoreFilters` with:

```ts
export type AdminStoreFilters = {
    search?: string;
    branchName?: string; // "all" = no filter
    areaName?: string;
    brand?: string;
    ownershipType?: StoreOwnershipType;
};
```

After the existing area filter block in `getAdminStores()`, add:

```ts
        if (filters.brand && filters.brand.trim().length > 0) {
            where.brand = { equals: filters.brand.trim(), mode: "insensitive" };
        }

        if (filters.ownershipType) {
            where.ownershipType = filters.ownershipType;
        }
```

In the `select` block for `prisma.store.findMany()`, add:

```ts
                ownershipType: true,
```

- [ ] **Step 4: Run the server filter test**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/dashboard/stores/actions.ts app/dashboard/stores/actions.test.ts
git commit -m "feat(stores): add server filters"
```

---

### Task 2: Initial URL Params

**Files:**
- Modify: `app/dashboard/stores/page.tsx`

**Interfaces:**
- Consumes: `AdminStoreFilters.brand`, `AdminStoreFilters.ownershipType`.
- Produces: initial server-rendered stores data matching URL params `brand` and `type`; props `initialBrand` and `initialOwnershipType`.

- [ ] **Step 1: Update `searchParams` type**

In `app/dashboard/stores/page.tsx`, replace the `searchParams` type with:

```ts
    searchParams: Promise<{
        search?: string;
        branch?: string;
        area?: string;
        brand?: string;
        type?: string;
    }>;
```

- [ ] **Step 2: Add ownership param normalization**

Below the imports, add:

```ts
const STORE_OWNERSHIP_FILTERS = ["REGULAR", "FRANCHISE", "UNKNOWN"] as const;

type StoreOwnershipFilter = (typeof STORE_OWNERSHIP_FILTERS)[number];

function normalizeOwnershipFilter(value?: string): StoreOwnershipFilter | "all" {
    const normalized = value?.trim().toUpperCase();
    return STORE_OWNERSHIP_FILTERS.includes(normalized as StoreOwnershipFilter)
        ? (normalized as StoreOwnershipFilter)
        : "all";
}
```

- [ ] **Step 3: Read and apply initial params**

After `initialAreaName`, add:

```ts
    const initialBrand = params.brand?.trim() || "all";
    const initialOwnershipType = normalizeOwnershipFilter(params.type);
```

Update the initial `getAdminStores()` filters:

```ts
    const initialData = await getAdminStores(null, 20, {
        search: initialSearch || undefined,
        branchName: initialBranchName !== "all" ? initialBranchName : undefined,
        areaName: initialAreaName !== "all" ? initialAreaName : undefined,
        brand: initialBrand !== "all" ? initialBrand : undefined,
        ownershipType:
            initialOwnershipType !== "all" ? initialOwnershipType : undefined,
    });
```

Pass the new props to `AdminStoresTable`:

```tsx
                initialBrand={initialBrand}
                initialOwnershipType={initialOwnershipType}
```

- [ ] **Step 4: Verify TypeScript catches no prop mismatch after Task 3**

Do not run typecheck yet in this task because `AdminStoresTable` does not accept the new props until Task 3. Continue directly to Task 3, then run the combined checks.

- [ ] **Step 5: Commit after Task 3 passes**

Commit this task together with Task 3 because the page props and component props are coupled:

```powershell
git add app/dashboard/stores/page.tsx app/dashboard/stores/_components/admin-stores-table.tsx app/dashboard/stores/admin-stores-table.test.ts
git commit -m "feat(stores): add brand and type controls"
```

---

### Task 3: Stores Table UI

**Files:**
- Modify: `app/dashboard/stores/_components/admin-stores-table.tsx`
- Test: `app/dashboard/stores/admin-stores-table.test.ts`

**Interfaces:**
- Consumes: `StoreItem.brand`, `StoreItem.ownershipType`, `allBrands`, `initialBrand`, `initialOwnershipType`.
- Produces: visible columns `Brand` and `Tipe Toko`, URL params `brand` and `type`, and server-side reload filters.

- [ ] **Step 1: Write the failing UI source test**

Create `app/dashboard/stores/admin-stores-table.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
    "app/dashboard/stores/_components/admin-stores-table.tsx",
    "utf8",
);

test("stores table renders brand and ownership columns", () => {
    assert.match(source, /<TableHead className="min-w-\[110px\]">\s*Brand\s*<\/TableHead>/);
    assert.match(source, /<TableHead className="min-w-\[110px\]">\s*Tipe Toko\s*<\/TableHead>/);
    assert.match(source, /formatBrandLabel\(store\.brand\)/);
    assert.match(source, /formatOwnershipLabel\(store\.ownershipType\)/);
});

test("stores table formats empty brand and UNKNOWN ownership as dash", () => {
    assert.match(source, /function formatBrandLabel\(brand: string \| null\)/);
    assert.match(source, /return normalized\.length > 0 \? normalized : "-"/);
    assert.match(source, /UNKNOWN:\s*"-"/);
});

test("stores table syncs brand and ownership filters to URL and server filters", () => {
    assert.match(source, /const \[brand, setBrand\] = useState\(initialBrand \?\? "all"\)/);
    assert.match(source, /const \[ownershipType, setOwnershipType\] = useState\(initialOwnershipType \?\? "all"\)/);
    assert.match(source, /params\.set\("brand", resolvedBrand\)/);
    assert.match(source, /params\.set\("type", resolvedOwnershipType\)/);
    assert.match(source, /brand: brand === "all" \? undefined : brand/);
    assert.match(source, /ownershipType:\s*ownershipType === "all" \? undefined : ownershipType/);
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/admin-stores-table.test.ts"
```

Expected: FAIL because the columns and filter states do not exist yet.

- [ ] **Step 3: Add local formatter helpers and ownership options**

In `app/dashboard/stores/_components/admin-stores-table.tsx`, after `type StoreItem = ...`, add:

```ts
const OWNERSHIP_FILTER_OPTIONS = [
    { value: "REGULAR", label: "Regular" },
    { value: "FRANCHISE", label: "Franchise" },
    { value: "UNKNOWN", label: "-" },
] as const;

function formatBrandLabel(brand: string | null) {
    const normalized = brand?.trim() ?? "";
    return normalized.length > 0 ? normalized : "-";
}

function formatOwnershipLabel(ownershipType: StoreItem["ownershipType"]) {
    const labels: Record<StoreItem["ownershipType"], string> = {
        REGULAR: "Regular",
        FRANCHISE: "Franchise",
        UNKNOWN: "-",
    };
    return labels[ownershipType];
}
```

- [ ] **Step 4: Add props and filter states**

Extend the component destructuring:

```ts
    initialBrand,
    initialOwnershipType,
```

Extend the props type:

```ts
    initialBrand?: string;
    initialOwnershipType?: StoreItem["ownershipType"] | "all";
```

After the existing `areaName` state, add:

```ts
    const [brand, setBrand] = useState(initialBrand ?? "all");
    const [ownershipType, setOwnershipType] = useState<
        StoreItem["ownershipType"] | "all"
    >(initialOwnershipType ?? "all");
```

Add brand options after refs:

```ts
    const brandOptions = Array.from(
        new Set(
            (allBrands ?? [])
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
```

- [ ] **Step 5: Sync filters to URL and server action**

Extend `pushFilterToUrl` overrides:

```ts
            brand?: string;
            ownershipType?: StoreItem["ownershipType"] | "all";
```

Add resolved values:

```ts
            const resolvedBrand = overrides.brand ?? brand;
            const resolvedOwnershipType =
                overrides.ownershipType ?? ownershipType;
```

Inside the debounce block, add:

```ts
                resolvedBrand && resolvedBrand !== "all"
                    ? params.set("brand", resolvedBrand)
                    : params.delete("brand");
                resolvedOwnershipType && resolvedOwnershipType !== "all"
                    ? params.set("type", resolvedOwnershipType)
                    : params.delete("type");
```

Update the `useCallback` dependency list:

```ts
        [search, branchName, areaName, brand, ownershipType, searchParams, router],
```

Extend the `filters` object in `loadData()`:

```ts
                brand: brand === "all" ? undefined : brand,
                ownershipType:
                    ownershipType === "all" ? undefined : ownershipType,
```

Update `loadData` dependencies:

```ts
        [search, branchName, areaName, brand, ownershipType],
```

Update the debounced reload effect dependencies:

```ts
    }, [search, branchName, areaName, brand, ownershipType, loadData]);
```

- [ ] **Step 6: Add filter dropdowns**

After the Area select block and before the manage actions block, add:

```tsx
                <Select
                    value={brand}
                    onValueChange={(val) => {
                        setBrand(val);
                        pushFilterToUrl({ brand: val });
                    }}
                >
                    <SelectTrigger className="flex-[0.8] min-w-[130px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Semua Brand" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            Semua Brand
                        </SelectItem>
                        {brandOptions.map((brandOption) => (
                            <SelectItem
                                key={brandOption}
                                value={brandOption}
                                className="text-xs"
                            >
                                {brandOption}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={ownershipType}
                    onValueChange={(val) => {
                        const nextValue = val as StoreItem["ownershipType"] | "all";
                        setOwnershipType(nextValue);
                        pushFilterToUrl({ ownershipType: nextValue });
                    }}
                >
                    <SelectTrigger className="flex-[0.8] min-w-[130px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Semua Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            Semua Tipe
                        </SelectItem>
                        {OWNERSHIP_FILTER_OPTIONS.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-xs"
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
```

- [ ] **Step 7: Add table columns and cells**

In the header, insert after `Nama Toko`:

```tsx
                                <TableHead className="min-w-[110px]">
                                    Brand
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Tipe Toko
                                </TableHead>
```

Change both empty/loading `colSpan` values from:

```tsx
colSpan={canManage ? 5 : 4}
```

to:

```tsx
colSpan={canManage ? 7 : 6}
```

In each row, insert after `<TableCell>{store.name}</TableCell>`:

```tsx
                                        <TableCell className="text-muted-foreground">
                                            {formatBrandLabel(store.brand)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatOwnershipLabel(store.ownershipType)}
                                        </TableCell>
```

- [ ] **Step 8: Run UI and server tests**

Run:

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/admin-stores-table.test.ts"
```

Expected: both PASS.

- [ ] **Step 9: Commit with Task 2**

Use the commit command from Task 2 Step 5 after the tests pass.

---

### Task 4: Documentation and Task Note

**Files:**
- Modify: `docs/project/05-routes-and-ui.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-store-brand-ownership-filters.md`

**Interfaces:**
- Consumes: implemented stores behavior from Tasks 1-3.
- Produces: canonical documentation and dated task note required by `AGENTS.md`.

- [ ] **Step 1: Update canonical UI docs**

In `docs/project/05-routes-and-ui.md`, replace this bullet:

```md
- Row toko menampilkan area toko.
```

with:

```md
- Row toko menampilkan area toko, brand, dan tipe toko.
- Tabel toko dapat difilter berdasarkan search, cabang, area, brand, dan tipe toko.
- Brand toko kosong ditampilkan sebagai `-`; tipe toko `UNKNOWN` ditampilkan sebagai `-`.
```

- [ ] **Step 2: Create the task note**

Copy the shape of `docs/agent-notes/TEMPLATE.md` into a new file named with the current Asia/Jakarta time, for example:

```text
docs/agent-notes/2026-09-14-2350-store-brand-ownership-filters.md
```

Use this content, adjusting only the timestamp in the filename:

```md
# Store Brand Ownership Filters

## Scope

Add Brand and Tipe Toko columns plus server-side Brand and Tipe Toko filters to `/dashboard/stores`. Outside scope: database migration, export behavior changes, and changes to store import parsing.

## Context and Sources

- `AI_RULES.md`
- `docs/project/05-routes-and-ui.md`
- `docs/project/06-database.md`
- `app/dashboard/stores/actions.ts`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/stores/_components/admin-stores-table.tsx`
- `prisma/schema.prisma`

## Changed Files

- `app/dashboard/stores/actions.ts`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/stores/_components/admin-stores-table.tsx`
- `app/dashboard/stores/actions.test.ts`
- `app/dashboard/stores/admin-stores-table.test.ts`
- `docs/project/05-routes-and-ui.md`

## Decisions

- No database migration is needed because `Store.brand` and `Store.ownershipType` already exist.
- Brand filtering uses direct database brand values from `getAllBrands()` and excludes empty options from the dropdown.
- Tipe toko filtering supports `REGULAR`, `FRANCHISE`, and `UNKNOWN`; `UNKNOWN` displays as `-`.

## Verification

- Focused source tests passed:
  - `node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"`
  - `node_modules\.bin\tsx.cmd "app/dashboard/stores/admin-stores-table.test.ts"`
- TypeScript passed:
  - `node_modules\.bin\tsc.cmd --noEmit --incremental false`

## Remaining Work and Risks

- None.
```

- [ ] **Step 3: Commit docs and task note**

```powershell
git add docs/project/05-routes-and-ui.md docs/agent-notes/*-store-brand-ownership-filters.md
git commit -m "docs: record stores filter behavior"
```

---

### Task 5: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all implemented tasks.
- Produces: evidence that tests and typecheck pass.

- [ ] **Step 1: Run focused tests**

```powershell
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"
$env:NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'; node_modules\.bin\tsx.cmd "app/dashboard/stores/admin-stores-table.test.ts"
```

Expected: both commands PASS.

- [ ] **Step 2: Run TypeScript**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false
```

Expected: exits with code 0. If unrelated existing type errors appear, record the exact errors in the final response and do not hide them.

- [ ] **Step 3: Inspect git status**

```powershell
git status --short
```

Expected: clean working tree after commits, or only intentional uncommitted files if the user asked not to commit.
