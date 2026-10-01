# Process Duration Widget Manager Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the `ProcessDurationWidget` so that users who only have access to a single branch (like BMC and BNM managers) see the top 5 longest duration grouped by **BMS (Teknisi)** instead of the useless "5 Cabang Terendah". 

**Architecture:** 
1. Update `ProcessDurationItem` type to use a generic `label` instead of `branchName`, and add a `viewMode` flag to `ProcessDurationData`.
2. Update the SQL query in `getAdminProcessDurationData` to conditionally group by `r."branchName"` (for ADMIN) or `u."name"` (by joining `User` table on `createdByNIK`, for Managers).
3. Update the Frontend widget to dynamically change the subtitle text and map the new `label` property.

**Tech Stack:** Next.js, React, Prisma Raw SQL

---

### Task 1: Update Types

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

- [ ] **Step 1: Rename `branchName` to `label` in `ProcessDurationItem`**
```typescript
export type ProcessDurationItem = {
    label: string; // Used to be branchName
    durationSeconds: number;
    formattedDuration: string;
};
```
- [ ] **Step 2: Add `viewMode` to `ProcessDurationData`**
```typescript
export type ProcessDurationData = {
    viewMode: "BRANCH" | "BMS";
    estimasiToBmc: ProcessDurationItem[];
    bmcToManager: ProcessDurationItem[];
    bmsWork: ProcessDurationItem[];
};
```

---

### Task 2: Update Backend Query

**Files:**
- Modify: `app/dashboard/preventive/actions.ts` (inside `getAdminProcessDurationData`)

- [ ] **Step 1: Write conditional query strings for grouping**
If `user.role === "ADMIN"`, the `SELECT` and `GROUP BY` should use `r."branchName" as "label"`. No extra joins needed.
If `user.role !== "ADMIN"`, the `SELECT` and `GROUP BY` should use `u."name" as "label"`. Add `JOIN "User" u ON r."createdByNIK" = u."NIK"`.

```typescript
    const isManager = user.role !== "ADMIN";
    
    // Modify raw query
    const rows = await prisma.$queryRaw<{ 
        label: string; 
        avg_estimasi_bmc: number | null; 
        avg_bmc_bnm: number | null; 
        avg_bms_work: number | null; 
    }[]>`
        WITH report_events AS (
            SELECT 
                ${isManager ? Prisma.sql`u."name" AS "label"` : Prisma.sql`r."branchName" AS "label"`},
                r."reportNumber",
                MAX(a."createdAt") FILTER (WHERE a.action IN ('SUBMITTED', 'RESUBMITTED_ESTIMATION')) AS estimasi_submit_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_APPROVED') AS bmc_estimasi_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_STARTED') AS bms_start_at,
                MAX(a."createdAt") FILTER (WHERE a.action IN ('COMPLETION_SUBMITTED', 'RESUBMITTED_WORK')) AS bms_complete_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_APPROVED') AS bmc_work_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'FINAL_APPROVED_BNM') AS bnm_approve_at
            FROM "Report" r
            JOIN "ActivityLog" a ON r."reportNumber" = a."reportNumber"
            ${isManager ? Prisma.sql`JOIN "User" u ON r."createdByNIK" = u."NIK"` : Prisma.empty}
            WHERE ${Prisma.join(reportPredicates, " AND ")}
            GROUP BY ${isManager ? Prisma.sql`u."name"` : Prisma.sql`r."branchName"`}, r."reportNumber"
        )
        SELECT 
            "label",
            AVG(EXTRACT(EPOCH FROM (bmc_estimasi_approve_at - estimasi_submit_at))) AS avg_estimasi_bmc,
            AVG(EXTRACT(EPOCH FROM (bnm_approve_at - bmc_work_approve_at))) AS avg_bmc_bnm,
            AVG(EXTRACT(EPOCH FROM (bms_complete_at - bms_start_at))) AS avg_bms_work
        FROM report_events
        GROUP BY "label"
    `;
```

- [ ] **Step 2: Update parsing and return `viewMode`**
In the mapping loop, change `branchName: row.branchName` to `label: row.label`.
Return `viewMode: isManager ? "BMS" : "BRANCH"` along with the arrays.

---

### Task 3: Update Frontend Widget

**Files:**
- Modify: `app/dashboard/_components/admin/process-duration-widget.tsx`

- [ ] **Step 1: Update type references inside `renderCard`**
Change the `items` signature in `renderCard` to use `label` instead of `branchName`:
`items: { label: string; formattedDuration: string }[] | undefined`
Update the map loop from `item.branchName` to `item.label`.

- [ ] **Step 2: Update subtitle conditionally based on `viewMode`**
Change the hardcoded text:
```tsx
<span className="text-xs text-muted-foreground">
    {data?.viewMode === "BMS" 
        ? "5 teknisi dengan rata-rata durasi tertinggi (satuan: jam dan menit)" 
        : "5 cabang dengan rata-rata durasi tertinggi (satuan: jam dan menit)"}
</span>
```

---

### Task 4: Commit

```bash
git add app/dashboard/preventive/actions.ts app/dashboard/_components/admin/process-duration-widget.tsx
git commit -m "feat: group process duration by BMS for branch managers"
```
