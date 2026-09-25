# Admin SLA Performance Query Chunking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `PrismaClientKnownRequestError: The query parameter limit supported by your database is exceeded` by chunking the query in `getAdminSlaPerformanceData` using cursor-based pagination.

**Architecture:** Modify the `prisma.report.findMany` call in `getAdminSlaPerformanceData` to fetch reports in batches of 1000 using cursor-based pagination (`take`, `cursor`, `orderBy`). This prevents generating a massive SQL query that hits the database parameter limit when resolving nested `activities`.

**Tech Stack:** Next.js, Prisma, TypeScript

## Global Constraints

- Use exact types and ensure TypeScript compilation passes.
- Maintain the exact same return format and logic for SLA calculations.
- Chunk size should be 1000.

---

### Task 1: Implement Cursor-based Chunking for SLA Data

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Prisma Client
- Produces: `AdminSlaPerformanceData` (No changes to the returned type)

- [ ] **Step 1: Update `getAdminSlaPerformanceData` query implementation**

Replace the existing `prisma.report.findMany` call (around line 1776) with a while loop that uses cursor-based pagination.

```typescript
  const baseWhere = {
    ...getReportBrandWhere(brand),
    ...(branchScope ? { branchName: { in: branchScope } } : {}),
    NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
    status: { in: ["APPROVED_BMC", "COMPLETED"] },
    updatedAt: { gte: window.start, ...(window.end ? { lt: window.end } : {}) },
  };

  const reports: {
    reportNumber: string;
    branchName: string;
    activities: { action: string; createdAt: Date }[];
  }[] = [];

  let cursor: string | undefined = undefined;
  const take = 1000;

  while (true) {
    const chunk = await prisma.report.findMany({
      where: baseWhere,
      take,
      ...(cursor ? { skip: 1, cursor: { reportNumber: cursor } } : {}),
      orderBy: { reportNumber: "asc" },
      select: {
        reportNumber: true,
        branchName: true,
        activities: {
          select: { action: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (chunk.length === 0) {
      break;
    }

    reports.push(...chunk);
    cursor = chunk[chunk.length - 1].reportNumber;
  }
```

- [ ] **Step 2: Format the code**

Run prettier to ensure formatting matches the project style.
Run: `npm run lint` or `npx prettier --write app/dashboard/queries.ts`
Expected: PASS

- [ ] **Step 3: Test local server**

Run: `npm run build` or load the dashboard locally.
Expected: The dashboard loads without the Prisma query parameter limit error.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "fix: chunk admin sla performance query to prevent parameter limit error"
```
