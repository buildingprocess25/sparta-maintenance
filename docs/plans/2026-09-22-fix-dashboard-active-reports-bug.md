# Fix Dashboard Active Reports Bug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:single-flow-task-execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a bug in the admin dashboard where reports with status `PENDING_CHECKLIST_REVIEW` are omitted from the active reports KPI sum, causing a mismatch in total reports.

**Architecture:** We will add `PENDING_CHECKLIST_REVIEW` to the list of statuses mapped to `pendingReviewReports` in the two aggregation functions within `app/dashboard/queries.ts`.

**Tech Stack:** TypeScript, Next.js, Prisma

## Global Constraints

- No other reporting metrics should be modified.
- Keep changes scoped to the requested task.

---

### Task 1: Fix Active Reports Aggregation

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Prisma `statusCounts` aggregation array
- Produces: Corrected `pendingReviewReports` count for the KPI dashboard

- [x] **Step 1: Write minimal implementation**

```typescript
// app/dashboard/queries.ts (in getAdminKpiMetric)
    for (const row of statusCounts) {
        if (row.status === "ESTIMATION_REJECTED") rejectedReports += row._count._all;
        if (["ESTIMATION_APPROVED", "IN_PROGRESS"].includes(row.status)) inProgressReports += row._count._all;
        if (["PENDING_ESTIMATION", "PENDING_CHECKLIST_REVIEW", "PENDING_REVIEW", "APPROVED_BMC"].includes(row.status)) pendingReviewReports += row._count._all;
        if (["ESTIMATION_REJECTED_REVISION", "REVIEW_REJECTED_REVISION"].includes(row.status)) revisionReports += row._count._all;
    }
```

```typescript
// app/dashboard/queries.ts (in getAdminBrandBreakdownKpi)
    for (const row of statusCounts) {
        if (["ESTIMATION_APPROVED", "IN_PROGRESS"].includes(row.status)) inProgressReports += row._count._all;
        if (["PENDING_ESTIMATION", "PENDING_CHECKLIST_REVIEW", "PENDING_REVIEW", "APPROVED_BMC"].includes(row.status)) pendingReviewReports += row._count._all;
        if (["ESTIMATION_REJECTED_REVISION", "REVIEW_REJECTED_REVISION"].includes(row.status)) revisionReports += row._count._all;
    }
```

- [x] **Step 2: Run typecheck to verify there are no syntax errors**

Run: `npm run typecheck` or equivalent check.
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "fix(dashboard): include PENDING_CHECKLIST_REVIEW in active reports KPI"
```
