# Sync Active Stores in BMS Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the Coverage BMS table only counts active stores, automatically deactivates BMS assignments when a store is deactivated, and provides sorting options by coverage percentage.

**Architecture:** We will modify `getBmsCoverageHierarchy` to filter active stores at the database query level. Additionally, we will update the `updateStore` actions in both Admin and BMC modules to use a transaction: when a store's `isActive` status is updated to `false`, the system will simultaneously set `isActive: false` on any of its active `BmsStoreAssignment` records. Finally, we will add client-side sorting in `BmsCoverageHierarchyTable` allowing users to sort branches and BMS list by coverage percentage (lowest to highest or highest to lowest).

**Tech Stack:** Next.js Server Actions, Prisma, React, TailwindCSS, shadcn/ui

## Global Constraints

- Prisma transactions must be used when updating multiple tables to ensure atomicity.

---

### Task 1: Filter Inactive Stores in Coverage Hierarchy

**Files:**
- Modify: `app/dashboard/preventive/coverage-hierarchy-action.ts`

**Interfaces:**
- Consumes: Prisma `bmsStoreAssignment.findMany`
- Produces: `BranchCoverageHierarchy[]` omitting any inactive stores.

- [ ] **Step 1: Add store active filter to query**

In `app/dashboard/preventive/coverage-hierarchy-action.ts` inside `getBmsCoverageHierarchy`, update the `prisma.bmsStoreAssignment.findMany` query to filter `store: { isActive: true }`.

```typescript
    const assignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            isActive: true,
            store: {
                isActive: true, // <-- Filter toko aktif
                branchName: {
                    not: EXCLUDED_ADMIN_BRANCH_NAME,
                    ...(branchFilter && branchFilter !== "all"
                        ? { equals: branchFilter }
                        : {}),
                },
                ...brandWhere,
            },
        },
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/preventive/coverage-hierarchy-action.ts
git commit -m "fix: filter inactive stores from coverage bms hierarchy"
```

---

### Task 2: Auto-deactivate Assignments on Store Deactivation (Admin)

**Files:**
- Modify: `app/admin/database/actions.ts`

**Interfaces:**
- Consumes: Admin `updateStore` action payload.
- Produces: Updated database state for both `Store` and `BmsStoreAssignment`.

- [ ] **Step 1: Update store with Prisma Transaction**

In `app/admin/database/actions.ts` inside `updateStore` (around line 509), wrap the store update and assignment deactivation in a `$transaction`.

```typescript
        const newIsActive = payload.isActive ?? true;

        await prisma.$transaction(async (tx) => {
            await tx.store.update({
                where: { code },
                data: {
                    name: payload.name,
                    branchName,
                    isActive: newIsActive,
                    areaName: payload.areaName,
                    brand,
                    ownershipType,
                },
            });

            if (newIsActive === false) {
                await tx.bmsStoreAssignment.updateMany({
                    where: { storeCode: code, isActive: true },
                    data: {
                        isActive: false,
                        unassignedAt: new Date(),
                        unassignedByNIK: admin.NIK,
                        notes: "Toko dinonaktifkan oleh Admin",
                    },
                });
            }
        });
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/database/actions.ts
git commit -m "feat(admin): auto-deactivate bms assignments when store is deactivated"
```

---

### Task 3: Auto-deactivate Assignments on Store Deactivation (BMC)

**Files:**
- Modify: `app/bmc/database/actions.ts`

**Interfaces:**
- Consumes: BMC `updateStore` action payload.
- Produces: Updated database state for both `Store` and `BmsStoreAssignment`.

- [ ] **Step 1: Update store with Prisma Transaction**

In `app/bmc/database/actions.ts` inside `updateStore` (around line 431), wrap the store update and assignment deactivation in a `$transaction`.

```typescript
        const newIsActive = payload.isActive ?? true;

        await prisma.$transaction(async (tx) => {
            await tx.store.update({
                where: { code },
                data: {
                    name: payload.name,
                    branchName: existing.branchName,
                    areaName: normalizedAreaName,
                    isActive: newIsActive,
                    brand,
                    ownershipType,
                },
            });

            if (newIsActive === false) {
                await tx.bmsStoreAssignment.updateMany({
                    where: { storeCode: code, isActive: true },
                    data: {
                        isActive: false,
                        unassignedAt: new Date(),
                        unassignedByNIK: user.NIK,
                        notes: "Toko dinonaktifkan oleh BMC",
                    },
                });
            }
        });
```

- [ ] **Step 2: Commit**

```bash
git add app/bmc/database/actions.ts
git commit -m "feat(bmc): auto-deactivate bms assignments when store is deactivated"
```

---

### Task 4: Add Coverage Percent Sorting in BMS Coverage Tab

**Files:**
- Modify: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`

**Interfaces:**
- Consumes: `initialHierarchy`
- Produces: Sorted hierarchy based on user selection.

- [ ] **Step 1: Add sortOrder state and Select UI**

In `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`, add a state for sorting and import `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `@/components/ui/select`.

Add a `Select` dropdown next to the `Search` input in the toolbar:

```tsx
    const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

    // UI Toolbar:
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative max-w-md flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
                placeholder="Cari cabang, nama BMS, NIK, atau nama/kode toko..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
            />
        </div>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "none" | "asc" | "desc")}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Urutkan Coverage..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">Default (Nama)</SelectItem>
                <SelectItem value="asc">Terendah Dulu</SelectItem>
                <SelectItem value="desc">Tertinggi Dulu</SelectItem>
            </SelectContent>
        </Select>
    </div>
```

- [ ] **Step 2: Apply sorting to filteredHierarchy**

Inside `useMemo` for `filteredHierarchy`, apply sorting logic to `results` and `bmsList` when `sortOrder !== "none"`.

```tsx
    const filteredHierarchy = useMemo(() => {
        const query = search.trim().toLowerCase();

        const results = initialHierarchy
            .map((branch) => {
                const branchMatch = branch.branchName.toLowerCase().includes(query);

                const matchedBmsList = branch.bmsList
                    .map((bms) => {
                        const bmsMatch =
                            bms.name.toLowerCase().includes(query) ||
                            bms.nik.toLowerCase().includes(query);

                        const matchedStores = bms.stores.filter(
                            (s) =>
                                s.storeName.toLowerCase().includes(query) ||
                                s.storeCode.toLowerCase().includes(query),
                        );

                        if (bmsMatch || matchedStores.length > 0) {
                            return {
                                ...bms,
                                stores: query && !bmsMatch ? matchedStores : bms.stores,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean) as typeof branch.bmsList;

                if (!query || branchMatch || matchedBmsList.length > 0) {
                    return {
                        ...branch,
                        bmsList: matchedBmsList,
                    };
                }
                return null;
            })
            .filter(Boolean) as BranchCoverageHierarchy[];

        if (sortOrder !== "none") {
            results.forEach((branch) => {
                branch.bmsList.sort((a, b) =>
                    sortOrder === "asc" ? a.kpiRate - b.kpiRate : b.kpiRate - a.kpiRate,
                );
            });

            results.sort((a, b) =>
                sortOrder === "asc"
                    ? a.coverageRate - b.coverageRate
                    : b.coverageRate - a.coverageRate,
            );
        }

        return results;
    }, [initialHierarchy, search, sortOrder]);
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx
git commit -m "feat: add sorting by coverage percent in bms coverage tab"
```