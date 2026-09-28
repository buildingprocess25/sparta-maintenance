# Detailed SLA Table Correction Design

## Goal

Correct the visual structure of the SLA Process Table on the `/dashboard/branches` page so that it exactly matches the user's intended design: a single table with one set of headers. Outer rows display branch-level aggregate averages, and when expanded, inner rows display BMS-level averages vertically aligned with the same columns.

## Data Query Changes (Backend)

The `getAdminDetailedSLAData` in `app/dashboard/branches/actions.ts` must return branch-level aggregate durations in addition to the BMS-level ones.
We will achieve this by modifying the raw SQL query to use PostgreSQL's `GROUPING SETS`:
```sql
GROUP BY GROUPING SETS (
    ("branchName"),
    ("branchName", "bmsName")
)
ORDER BY "branchName", "bmsName" NULLS FIRST
```
Rows where `bmsName` is `NULL` represent the branch-level aggregates. We will map these into the `SLADurationBranch` return object.

### Type Updates
```typescript
export type SLADurationBranch = {
    branchName: string;
    bmsList: SLADurationBMS[];
    
    // Branch-level averages
    estimasiToAppvBMC: number | null;
    estimasiToRevisiBMC: number | null;
    appvBMCToWorkStart: number | null;
    workStartToRealisasi: number | null;
    realisasiToRevisiBMC: number | null;
    realisasiToAppvBMC: number | null;
    appvBMCToAppvMGR: number | null;
};
```

## Component Changes (Frontend)

The `AdminSLATable` in `app/dashboard/branches/_components/admin-sla-table.tsx` will be restructured:
- Only ONE `<TableHeader>`.
- The columns will be: `Nama Cabang / BMS` and the 7 SLA duration headers.
- **Outer Row (Branch)**:
  - Cell 1: Caret icon + `[branchName]` + `([bmsList.length] BMS)`
  - Cell 2-8: Formatted branch-level averages.
- **Inner Rows (BMS)**:
  - Rendered immediately after the outer row if `isExpanded`.
  - Cell 1: `bmsName` (with left padding to indicate indentation).
  - Cell 2-8: Formatted BMS-level averages.
- The nested table approach introduced previously will be removed in favor of this single flat-table-with-collapsible-rows approach to ensure perfect column alignment.
