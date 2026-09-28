# SLA Table UI Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the SLA Table to use a single set of columns, with branch-level averages on outer rows (calculated via DB Grouping Sets) and BMS-level averages on expanded inner rows.

**Architecture:** We will modify the `getAdminDetailedSLAData` raw SQL to use `GROUP BY GROUPING SETS`, parse the branch-total rows (where `bmsName` is NULL), and update the React `AdminSLATable` to flatten the table structure so outer and inner rows share the exact same `TableHead`s.

**Tech Stack:** Next.js, Prisma raw SQL, PostgreSQL, React, Tailwind CSS.

## Global Constraints

- No external libraries.
- `GROUPING SETS` must be supported by the current Prisma+PostgreSQL version.

---

### Task 1: Update SLADurationBranch Type in Actions

**Files:**
- Modify: `app/dashboard/branches/actions.ts`

**Interfaces:**
- Produces: Updated `SLADurationBranch` type with 7 duration fields.

- [ ] **Step 1: Update the SLADurationBranch Type**

Use `replace_file_content` to add the 7 fields to `SLADurationBranch` type.

```typescript
export type SLADurationBranch = {
    branchName: string;
    bmsList: SLADurationBMS[];
    estimasiToAppvBMC: number | null;
    estimasiToRevisiBMC: number | null;
    appvBMCToWorkStart: number | null;
    workStartToRealisasi: number | null;
    realisasiToRevisiBMC: number | null;
    realisasiToAppvBMC: number | null;
    appvBMCToAppvMGR: number | null;
};
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/actions.ts
git commit -m "refactor(dashboard): update SLADurationBranch type for branch averages" --no-verify
```

### Task 2: Update SQL Query and Data Mapping

**Files:**
- Modify: `app/dashboard/branches/actions.ts`

**Interfaces:**
- Produces: `getAdminDetailedSLAData` returning the new shape with actual branch averages.

- [ ] **Step 1: Replace the SQL Query and Data Mapping**

Use a script or `replace_file_content`/`multi_replace_file_content` to update the SQL query from:
```sql
        GROUP BY "branchName", "bmsName"
        ORDER BY "branchName", "bmsName"
```
To:
```sql
        GROUP BY GROUPING SETS (
            ("branchName"),
            ("branchName", "bmsName")
        )
        ORDER BY "branchName", "bmsName" NULLS FIRST
```

And update the mapping loop to handle `row.bmsName === null` for the branch root object.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/actions.ts
git commit -m "feat(dashboard): fetch branch-level SLA averages using GROUPING SETS" --no-verify
```

### Task 3: Flatten AdminSLATable UI

**Files:**
- Modify: `app/dashboard/branches/_components/admin-sla-table.tsx`

**Interfaces:**
- Consumes: Updated `SLADurationBranch` data structure.

- [ ] **Step 1: Rewrite AdminSLATable to use a single table**

Remove the nested `<Table>` entirely. Return to a single `<Table>`, `<TableHeader>`, and map the `data` such that the outer row displays `branch.estimasiToAppvBMC`, etc., and the inner rows display `bms.estimasiToAppvBMC`.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/_components/admin-sla-table.tsx
git commit -m "feat(dashboard): refactor SLA table to single flat structure with aligned columns" --no-verify
```
