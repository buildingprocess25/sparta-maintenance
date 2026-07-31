# Preventive Dashboard Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the Preventive dashboard show only completed stores in Sudah Checklist, only pending stores in Belum Checklist, search every scoped store on the server, and summarize current branches only.

**Architecture:** The Preventive dashboard uses Store.branchName as its sole branch identity. The server action computes Preventive status for filtered stores, selects the requested completion subset before cursor pagination, and returns only that page. The client controls its active tab and sends that completion filter plus the debounced search string on every request.

**Tech Stack:** Next.js App Router server actions, React, TypeScript, Prisma/PostgreSQL, existing shadcn UI, Node assert, tsx, ESLint.

## Global Constraints

- No schema change, migration, database write, or production data change.
- Preserve ADMIN, BMC, and BNM_MANAGER authorization and existing approval-specific scope views.
- Use Store.branchName for Preventive branch filters and summaries; never derive Preventive branches from User.branchNames hierarchy or Store.areaName.
- Preserve the current complete-Preventive evidence rule and Asia/Jakarta quarter boundaries.
- Keep the existing 350 ms search debounce and add no dependency.
- Create a dated docs/agent-notes note before committing implementation.

---

## File Structure

Create:

- app/dashboard/preventive/preventive-dashboard.ts — pure completion, pagination, tab-filter, and branch-summary helpers.
- app/dashboard/preventive/preventive-dashboard.spec.ts — executable assertions for those rules.
- docs/agent-notes/YYYY-MM-DD-HHMM-fix-preventive-dashboard.md — implementation evidence.

Modify:

- app/dashboard/preventive/actions.ts — filter/page server rows by completion state and current store branch; expose Preventive branch options.
- app/dashboard/preventive/page.tsx — load current-store branch options and request the completed page initially.
- app/dashboard/preventive/_components/admin-preventive-table.tsx — control active tab and send search/completion filters to the server.

Do not modify app/dashboard/queries.ts: its generic hierarchy remains for approval views that intentionally retain legacy visibility.

---

### Task 1: Establish tested Preventive list rules

**Files:**

- Create: app/dashboard/preventive/preventive-dashboard.ts
- Create: app/dashboard/preventive/preventive-dashboard.spec.ts

**Interfaces:**

- Produces PreventiveCompletion = "all" | "completed" | "pending".
- Produces splitPreventiveRows(rows, quarterKey), paginatePreventiveRows(rows, cursor, limit), getPreventiveCompletionForTab(tab), and summarizePreventiveBranches(rows, quarterKey).

- [ ] **Step 1: Write the failing assertion**

~~~ts
const rows = [
  { storeCode: "A001", branchName: "PEKANBARU", areaName: "KARAWANG", q3: null },
  { storeCode: "A002", branchName: "PEKANBARU", areaName: "PARUNG", q3: { reportNumber: "A002-001" } },
  { storeCode: "B001", branchName: "LAMPUNG", areaName: "SERANG", q3: null },
];

assert.deepEqual(splitPreventiveRows(rows, "q3").completed.map((row) => row.storeCode), ["A002"]);
assert.deepEqual(splitPreventiveRows(rows, "q3").pending.map((row) => row.storeCode), ["A001", "B001"]);
assert.deepEqual(summarizePreventiveBranches(rows, "q3").map((row) => row.branchName), ["LAMPUNG", "PEKANBARU"]);
assert.equal(getPreventiveCompletionForTab("quarter"), "completed");
assert.equal(getPreventiveCompletionForTab("pending"), "pending");
assert.equal(getPreventiveCompletionForTab("matrix"), "all");
~~~

- [ ] **Step 2: Verify RED**

Run: npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'

Expected: fail because the helper module or active-tab mapper does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

~~~ts
export function getPreventiveCompletionForTab(tab: string): PreventiveCompletion {
  if (tab === "quarter") return "completed";
  if (tab === "pending") return "pending";
  return "all";
}

export function splitPreventiveRows<T extends Partial<Record<PreventiveQuarterKey, unknown>>>(
  rows: T[],
  quarterKey: PreventiveQuarterKey,
) {
  const completed: T[] = [];
  const pending: T[] = [];
  for (const row of rows) (row[quarterKey] ? completed : pending).push(row);
  return { completed, pending };
}
~~~

Implement cursor paging from the supplied row list. Group branch summaries by row.branchName only and sort by name.

- [ ] **Step 4: Verify GREEN**

Run: npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'

Expected: preventive dashboard assertions passed.

### Task 2: Make the server action page the correct store subset

**Files:**

- Modify: app/dashboard/preventive/actions.ts
- Modify: app/dashboard/preventive/preventive-dashboard.ts
- Modify: app/dashboard/preventive/preventive-dashboard.spec.ts

**Interfaces:**

- AdminPreventiveFilters gains completion?: PreventiveCompletion.
- getAdminPreventive(cursor, limit, filters) returns rows and totalCount for the requested subset; KPI, branch totals, and history remain based on the full server-filtered store set.
- getPreventiveBranchOptions() returns distinct, sorted, authorized Store.branchName values.

- [ ] **Step 1: Extend the failing paging assertion**

~~~ts
const pendingRows = splitPreventiveRows(rows, "q3").pending;
assert.deepEqual(paginatePreventiveRows(pendingRows, null, 1), {
  rows: [rows[0]],
  nextCursor: "A001",
});
assert.deepEqual(paginatePreventiveRows(pendingRows, "A001", 1), {
  rows: [rows[2]],
  nextCursor: null,
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'

Expected: fail until paginatePreventiveRows exists.

- [ ] **Step 3: Implement server selection before paging**

In actions.ts, replace paging-before-status with:

~~~ts
const allRows = allStores.map(buildRow);
const { completed, pending } = splitPreventiveRows(allRows, quarterKey);
const rowsForCompletion =
  filters.completion === "pending" ? pending :
  filters.completion === "completed" ? completed :
  allRows;
const { rows, nextCursor } = paginatePreventiveRows(rowsForCompletion, cursor, limit);
~~~

Delete the action-local admin hierarchy expansion: getAdminBranchChildren, resolveDashboardBranchName, getAdminBranchHierarchy call, and seeded branch summaries. Constrain reports by the already-authorized store codes, then build Preventive summaries from allRows grouped by current row.branchName. Add getPreventiveBranchOptions() using a scoped Store query with distinct branchName, branchName ascending order, and branchName selection.

- [ ] **Step 4: Verify GREEN**

Run:

~~~powershell
npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'
npx eslint app/dashboard/preventive/actions.ts app/dashboard/preventive/preventive-dashboard.ts app/dashboard/preventive/preventive-dashboard.spec.ts
~~~

Expected: assertions pass and ESLint exits 0.

### Task 3: Drive every visible list from server filters

**Files:**

- Modify: app/dashboard/preventive/page.tsx
- Modify: app/dashboard/preventive/_components/admin-preventive-table.tsx
- Modify: app/dashboard/preventive/preventive-dashboard.ts
- Modify: app/dashboard/preventive/preventive-dashboard.spec.ts

**Interfaces:**

- The page requests getPreventiveBranchOptions() for ADMIN and initial completion: "completed".
- Every table refresh and cursor request sends branch, year, quarter, completion from getPreventiveCompletionForTab(activeTab), and search: tableSearch.trim() || undefined.

- [ ] **Step 1: Verify tab mapping assertions RED then GREEN**

Add:

~~~ts
assert.equal(getPreventiveCompletionForTab("branches"), "all");
assert.equal(getPreventiveCompletionForTab("history"), "all");
~~~

Run: npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'

Expected before mapping: fail. Expected after mapping: preventive dashboard assertions passed.

- [ ] **Step 2: Request current branch options and completed rows initially**

In page.tsx, replace generic getAdminBranchOptions with getPreventiveBranchOptions and add:

~~~ts
getAdminPreventive(null, 20, {
  year: currentYear,
  branchName: defaultBranch,
  completion: "completed",
})
~~~

- [ ] **Step 3: Make the client tab-controlled**

In admin-preventive-table.tsx:

~~~tsx
const [activeTab, setActiveTab] = useState("quarter");

<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
~~~

Remove the whole-client pendingRows payload/state and pending-only observer. Both quarter and pending tabs render paginated data because the server already filtered completion status. Keep matrix, branch, and history requests on "all".

Every refresh and loadMore must use:

~~~ts
{
  branchName,
  year,
  quarter,
  completion: getPreventiveCompletionForTab(activeTab),
  search: tableSearch.trim() || undefined,
}
~~~

Include activeTab and tableSearch in the request effect and loadMore dependencies. On a tab switch, clear stale rows and reset the cursor before showing the existing loading row.

- [ ] **Step 4: Run focused verification**

~~~powershell
npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'
npx eslint app/dashboard/preventive/page.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx app/dashboard/preventive/actions.ts app/dashboard/preventive/preventive-dashboard.ts app/dashboard/preventive/preventive-dashboard.spec.ts
git diff --check
~~~

Expected: all commands exit 0.

- [ ] **Step 5: Browser acceptance check**

1. Pick a quarter with completed and pending stores.
2. Confirm Sudah Checklist contains no Belum badge and matches the completed KPI.
3. Confirm Belum Checklist contains only pending stores and matches the pending KPI.
4. Search a known store beyond the first page; it appears without manual scrolling.
5. Open Cabang; legacy area labels such as KARAWANG, PARUNG, SERANG, BEKASI, CILEUNGSI_2, CIKOKOL, BALARAJA, and BOGOR do not appear unless they are actual current Store.branchName values.
6. Change tab, branch, quarter, and year; verify cursor loading retains the same filter.

- [ ] **Step 6: Record and commit**

Create the dated task note from docs/agent-notes/TEMPLATE.md, then run:

~~~powershell
npm run test:agent-note
git diff --check
git add app/dashboard/preventive/actions.ts app/dashboard/preventive/page.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx app/dashboard/preventive/preventive-dashboard.ts app/dashboard/preventive/preventive-dashboard.spec.ts docs/agent-notes/YYYY-MM-DD-HHMM-fix-preventive-dashboard.md docs/superpowers/plans/2026-07-30-fix-preventive-dashboard.md
git commit -m "fix: correct preventive dashboard lists"
~~~

Expected: checks and hook pass without --no-verify.

## Self-Review

- Tasks 1-3 cover completed-only and pending-only quarter tabs.
- Task 3 sends search to the server on first and cursor requests.
- Task 2 prevents approval hierarchy and area values from producing Preventive branch rows.
- The plan adds no database or dependency work.
