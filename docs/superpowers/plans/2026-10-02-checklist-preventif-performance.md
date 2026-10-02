# Checklist Preventif Performance & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve performance and UX of Checklist Preventif dashboard by adding Next.js unstable_cache, instant skeleton loaders, and fixing client-side search for the Cabang tab.

**Architecture:** We will implement unstable_cache at the database query level in `actions.ts`. We will remove the debounce on loading state and introduce a Skeleton loader in `admin-preventive-table.tsx`. Finally, we will decouple the Cabang tab search from the backend query to perform client-side filtering on branch names.

**Tech Stack:** Next.js (App Router), React, TailwindCSS, Prisma

## Global Constraints

- Use `unstable_cache` from `next/cache`.
- Follow existing UI patterns with `lucide-react` icons.

---

### Task 1: Add Next.js Server-Side Cache for getAdminPreventive

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: N/A
- Produces: `getAdminPreventive` with cached query block.

- [ ] **Step 1: Write the cached query implementation**

Modify `actions.ts` to import `unstable_cache` and wrap the heavy DB query block. We'll extract the core DB logic into an internal cached function. 

```typescript
import { unstable_cache } from "next/cache";

// Add this above getAdminPreventive function
const getCachedPreventiveData = unstable_cache(
    async (
        year: number,
        quarter: PreventiveQuarter,
        branchScopeJson: string, // serialized branchScope 
        branchName: string | undefined,
        brandWhereJson: string // serialized brand where clause
    ) => {
        // Implementation of the DB query fetching all stores and their reports
        // Returns { reports, allStores, storeMap }
        const branchScope = JSON.parse(branchScopeJson);
        const where: Prisma.StoreWhereInput = {
            isActive: true,
            ...branchScope,
        };
        if (branchName && branchName !== "all") {
            where.branchName = branchName;
        }
        const brandWhere = JSON.parse(brandWhereJson);
        if (Object.keys(brandWhere).length > 0) {
            where.AND = [brandWhere];
        }

        const allStores = await prisma.store.findMany({
            where,
            orderBy: { code: "asc" },
            select: { code: true, name: true, branchName: true },
        });

        const { start: yearStart, endExclusive: yearEnd } = getJakartaYearWindow(year);
        const allStoreCodes = allStores.map((s) => s.code);
        
        const reportPredicates: Prisma.Sql[] = [
            completePreventiveEvidenceSql({
                statusColumn: Prisma.sql`r."status"`,
                itemsColumn: Prisma.sql`r."items"`,
            }),
            Prisma.sql`r."createdAt" >= ${yearStart}`,
            Prisma.sql`r."createdAt" < ${yearEnd}`,
        ];

        if (allStoreCodes.length > 0) {
            reportPredicates.push(
                Prisma.sql`r."storeCode" IN (${Prisma.join(allStoreCodes)})`
            );
        } else {
            reportPredicates.push(Prisma.sql`FALSE`);
        }

        const reports: PreventiveReportRow[] = allStoreCodes.length === 0 ? [] : await prisma.$queryRaw`
            SELECT
                r."reportNumber", r."storeCode", r."storeName", r."branchName",
                r."status"::text AS "status", r."createdAt", r."createdByNIK",
                u."name" AS "createdByName",
                COALESCE((
                    SELECT count(*)::int
                    FROM jsonb_array_elements(r."items") AS item
                    WHERE item->>'preventiveCondition' = 'NOT_OK'
                ), 0) AS "issueCount"
            FROM "Report" r
            LEFT JOIN "User" u ON u."NIK" = r."createdByNIK"
            WHERE ${Prisma.join(reportPredicates, " AND ")}
            ORDER BY r."createdAt" DESC
        `;

        return { reports, allStores };
    },
    ["preventive-dashboard-data"],
    { revalidate: 300, tags: ["preventive-reports"] }
);
```

Update `getAdminPreventive` to call this cached function:

```typescript
        const quarter = filters.quarter ?? getCurrentQuarter();
        const quarterKey = getQuarterKey(quarter);
        
        const branchScope = getBranchScope(user);
        const brandWhere = brand !== "ALL" ? (getStoreBrandWhere(brand) || {}) : {};

        const { reports, allStores } = await getCachedPreventiveData(
            filters.year,
            quarter,
            JSON.stringify(branchScope),
            filters.branchName,
            JSON.stringify(brandWhere)
        );
        
        const storeMap = new Map(allStores.map(s => [s.code, s]));
```
*Note: Make sure to properly adjust the search filter. If `filters.search` is present, it should filter `allStores` and `reports` AFTER fetching from the cache, so we don't cache per-search.*

- [ ] **Step 2: Commit**
```bash
git add app/dashboard/preventive/actions.ts
git commit -m "perf: add server-side cache for preventive dashboard"
```


### Task 2: Fix Cabang Tab Search Behavior

**Files:**
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: Task 1

- [ ] **Step 1: Separate frontend search from backend for Cabang tab**

In `admin-preventive-table.tsx`, update the `useEffect` that fetches data to NOT send `tableSearch` if `activeTab === "branches"`.

```tsx
    useEffect(() => {
        if (!didHydrateRef.current) {
            didHydrateRef.current = true;
            return;
        }

        setIsLoading(true); // Immediate loading state
        const timer = setTimeout(async () => {
            try {
                const result = await getAdminPreventive(null, 30, {
                    branchName,
                    brand,
                    year,
                    quarter,
                    completion: getPreventiveCompletionForTab(activeTab),
                    // Only send search if NOT in branches tab
                    search: activeTab === "branches" ? undefined : (tableSearch.trim() || undefined),
                });
                applyResult(result);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        }, 100); // Reduce timeout since we want fast feedback

        return () => clearTimeout(timer);
    }, [branchName, brand, year, quarter, activeTab, tableSearch, applyResult]);
```

- [ ] **Step 2: Implement client-side search for Cabang tab**

```tsx
    const sortedBranchSummaries = useMemo(() => {
        const sorted = [...branchSummaries].sort((a, b) =>
            branchSort === "asc"
                ? a.completionRate - b.completionRate
                : b.completionRate - a.completionRate
        );
        
        const normalizedSearch = tableSearch.trim().toLowerCase();
        if (!normalizedSearch) return sorted;
        
        return sorted.filter(branch => 
            branch.branchName.toLowerCase().includes(normalizedSearch)
        );
    }, [branchSummaries, branchSort, tableSearch]);
```

- [ ] **Step 3: Update getAdminPreventive to filter cached data by search**

In `actions.ts`, since we now cache all stores, we should apply `filters.search` *after* fetching from the cache.

```typescript
        // After await getCachedPreventiveData...
        let filteredStores = allStores;
        let filteredReports = reports;

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredStores = allStores.filter(store => 
                store.code.toLowerCase().includes(searchLower) || 
                store.name.toLowerCase().includes(searchLower)
            );
            const filteredStoreCodes = new Set(filteredStores.map(s => s.code));
            filteredReports = reports.filter(r => 
                r.storeCode && filteredStoreCodes.has(r.storeCode)
            );
        }
        
        const storeMap = new Map(filteredStores.map((store) => [store.code, store]));
```
Then use `filteredStores` and `filteredReports` in the subsequent loop instead of `allStores` and `reports`.

- [ ] **Step 4: Commit**
```bash
git add app/dashboard/preventive/_components/admin-preventive-table.tsx app/dashboard/preventive/actions.ts
git commit -m "fix: make cabang tab search client-side and filter cached data"
```

### Task 3: Improve UX with Instant Skeleton Loaders

**Files:**
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`

**Interfaces:**
- Consumes: Task 2

- [ ] **Step 1: Create a generic TableSkeleton component**

Add a simple Skeleton loader right inside the file or use an existing one if available. We will use a custom simple skeleton matching the table structure.

```tsx
function TableSkeleton({ cols, rows = 5 }: { cols: number, rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
```

- [ ] **Step 2: Replace standard spinners with TableSkeleton across all tabs**

In the "quarter" tab:
```tsx
                                    {isLoading ? (
                                        <TableSkeleton cols={8} rows={10} />
                                    ) : filteredRows.length === 0 ? (
```

In the "pending" tab:
```tsx
                                    {isLoading ? (
                                        <TableSkeleton cols={4} rows={10} />
                                    ) : filteredRows.length === 0 ? (
```

In the "matrix" tab:
```tsx
                                    {isLoading ? (
                                        <TableSkeleton cols={7} rows={10} />
                                    ) : filteredRows.length === 0 ? (
```

In the "branches" tab (which currently has no loading state, wrap its `TableBody` contents):
```tsx
                                    <TableBody>
                                        {isLoading ? (
                                            <TableSkeleton cols={6} rows={10} />
                                        ) : sortedBranchSummaries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyTable
                                                        icon={Store}
                                                        title="Tidak ada cabang"
                                                        description="Filter belum menghasilkan ringkasan cabang."
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            sortedBranchSummaries.map((branch) => (
// ...
```

In the "history" tab:
```tsx
                                    <TableBody>
                                        {isLoading ? (
                                            <TableSkeleton cols={7} rows={10} />
                                        ) : filteredHistoryRows.length === 0 ? (
// ...
```

- [ ] **Step 3: Commit**
```bash
git add app/dashboard/preventive/_components/admin-preventive-table.tsx
git commit -m "feat: add skeleton loading for immediate feedback"
```
