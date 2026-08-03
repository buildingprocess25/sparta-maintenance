# Brand-Owned Branches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only active-store-owned branches for a selected Brand in the ADMIN dashboard realisasi trend and branch-performance table, while correcting brand-label colors.

**Architecture:** Derive ownership from active `Store` rows through `getStoreBrandWhere()`. Fetch owned branch names once in `getAdminCommandCenterData()`, map them through the existing ADMIN hierarchy, and pass the resulting parent-branch set to the two dashboard aggregations. Do not change report KPI filtering or `ALL` coverage.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Node `node:test`, existing shadcn/ui.

## Global Constraints

- No schema migration, production data update, dependency, export, BMC, or BNM change.
- A selected Brand owns a branch only when it has at least one active `Store` there.
- `ALL` keeps existing coverage; an empty selected-brand set renders no branch rows.
- Alfamart labels are red and Lawson labels are blue.
- Create a dated agent note before committing; never use `--no-verify`.

---

### Task 1: Build the visible branch-name set

**Files:**
- Modify: `lib/store-brand-filter.ts`
- Test: `lib/store-brand-filter.test.ts`

**Interfaces:**
- Produces `getVisibleBrandBranchNames(brand, allBranchNames, ownedBranchNames): Set<string>`.
- `brand` is `StoreBrandFilter`; both name arguments are `Iterable<string>`.

- [ ] **Step 1: Add the failing test**

```ts
test('getVisibleBrandBranchNames keeps all branches only for ALL', () => {
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('ALL', ['A', 'B'], ['B']),
    new Set(['A', 'B']),
  );
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('LAWSON', ['A', 'B'], ['B']),
    new Set(['B']),
  );
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('ALFAMART', ['A', 'B'], []),
    new Set(),
  );
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx tsx lib/store-brand-filter.test.ts`  
Expected: fails because `getVisibleBrandBranchNames` is not exported.

- [ ] **Step 3: Add the minimal helper**

```ts
export function getVisibleBrandBranchNames(
  brand: StoreBrandFilter,
  allBranchNames: Iterable<string>,
  ownedBranchNames: Iterable<string>,
) {
  return new Set(brand === 'ALL' ? allBranchNames : ownedBranchNames);
}
```

- [ ] **Step 4: Verify the test passes**

Run: `npx tsx lib/store-brand-filter.test.ts`  
Expected: all brand tests pass.

### Task 2: Scope the dashboard realisasi and performance branches

**Files:**
- Modify: `app/dashboard/queries.ts:1442-1532, 1691-1710`
- Test: `lib/store-brand-filter.test.ts`

**Interfaces:**
- Consumes the Task 1 helper, `getStoreBrandWhere()`, and `resolveAdminParentBranch()`.
- Adds `visibleBranchNames: Set<string>` to `getAdminBranchPerformance()` and `getAdminBranchTrend()`.

- [ ] **Step 1: Fetch the owned branch set once**

Add this private query in `app/dashboard/queries.ts`:

```ts
async function getBrandOwnedBranchNames(
  brand: StoreBrandFilter,
  hierarchy: AdminBranchHierarchy,
) {
  const rows = await prisma.store.findMany({
    where: { ...getStoreBrandWhere(brand), isActive: true },
    select: { branchName: true },
    distinct: ['branchName'],
  });
  return getVisibleBrandBranchNames(
    brand,
    hierarchy.options.map((option) => option.name),
    rows.map((row) => resolveAdminParentBranch(row.branchName, hierarchy)),
  );
}
```

Call it once after `getAdminBranchHierarchy()` resolves in `getAdminCommandCenterData()`.

- [ ] **Step 2: Apply the set to both aggregations**

Change the map seeding in both functions from:

```ts
for (const option of hierarchy.options) {
  getBranchAccumulator(branchMap, option.name);
}
```

to:

```ts
for (const option of hierarchy.options) {
  if (visibleBranchNames.has(option.name)) {
    getBranchAccumulator(branchMap, option.name);
  }
}
```

Pass the same `visibleBranchNames` into both `getAdminBranchPerformance()` and `getAdminBranchTrend()`. Keep their existing report queries and sorting intact.

- [ ] **Step 3: Verify code quality**

Run:

```powershell
npx eslint app/dashboard/queries.ts lib/store-brand-filter.ts lib/store-brand-filter.test.ts
npx tsc --noEmit
git diff --check
```

Expected: every command exits `0`.

### Task 3: Swap the breakdown label colors

**Files:**
- Modify: `app/dashboard/_components/admin/admin-new-dashboard.tsx:313-317, 432-436`
- Test: `app/dashboard/_components/admin/admin-trend-filter.test.ts`

**Interfaces:**
- Uses existing `breakdown.alfamart` and `breakdown.lawson` values.

- [ ] **Step 1: Add failing source assertions**

```ts
assert.match(source, /text-red-600">Alfamart:/);
assert.match(source, /text-blue-600">Lawson:/);
```

- [ ] **Step 2: Verify the assertion fails**

Run: `npx tsx app/dashboard/_components/admin/admin-trend-filter.test.ts`  
Expected: fails because Alfamart is blue and Lawson is red.

- [ ] **Step 3: Swap only the classes in both breakdown blocks**

```tsx
<span className="text-red-600">Alfamart: ...</span>
<span className="text-blue-600">Lawson: ...</span>
```

- [ ] **Step 4: Run final verification and commit**

```powershell
npx tsx lib/store-brand-filter.test.ts
npx tsx app/dashboard/_components/admin/admin-trend-filter.test.ts
npx eslint app/dashboard/queries.ts app/dashboard/_components/admin/admin-new-dashboard.tsx lib/store-brand-filter.ts lib/store-brand-filter.test.ts app/dashboard/_components/admin/admin-trend-filter.test.ts
npx tsc --noEmit
git diff --check
git add app/dashboard/queries.ts app/dashboard/_components/admin/admin-new-dashboard.tsx lib/store-brand-filter.ts lib/store-brand-filter.test.ts app/dashboard/_components/admin/admin-trend-filter.test.ts docs/agent-notes/<timestamp>-brand-owned-branches.md
git commit -m "feat: scope dashboard branches by brand"
```

Expected: tests, lint, TypeScript, and diff check pass before commit.

## Self-Review

- Task 2 covers both requested dashboard branch views and uses the approved active-store definition.
- Task 3 changes both visible breakdown blocks and nothing else in the layout.
- Empty selected-brand ownership is represented by an empty set, never an all-branch fallback.