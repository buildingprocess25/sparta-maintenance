# Preventive Dashboard Branch Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the preventive dashboard API to query reports based on current store assignment rather than the historical branch name on the report.

**Architecture:** We will remove the `r."branchName"` filter from the `reportPredicates` in `getAdminPreventive` and `getAdminPreventiveKpiData`. Instead, we will rely exclusively on querying reports where `r."storeCode"` is in the list of `storeCodes` that were just fetched from the `Store` table using the current branch filters.

**Tech Stack:** Next.js Server Actions, Prisma raw SQL

## Global Constraints

- Do not modify export logic or SLA table logic.
- Ensure the modified raw SQL queries do not produce syntax errors if `allStoreCodes` is empty.

---

### Task 1: Update `getAdminPreventive` API

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: `allStoreCodes` derived from `Store` query
- Produces: Corrected `PreventiveReportRow[]` using current store mapping

- [ ] **Step 1: Replace branch predicates with storeCode IN clause**

In `app/dashboard/preventive/actions.ts`, locate the `getAdminPreventive` function (around line 267). Replace the `user.role === "ADMIN"` and `filters.search` conditional blocks that append to `reportPredicates`:

```typescript
        if (user.role === "ADMIN") {
            if (filters.branchName && filters.branchName !== "all") {
                reportPredicates.push(
                    Prisma.sql`r."branchName" = ${filters.branchName}`,
                );
            } else {
                reportPredicates.push(
                    Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`,
                );
            }
        } else if (user.branchNames.length > 0) {
            reportPredicates.push(
                Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`,
            );
        }

        if (filters.search) {
            reportPredicates.push(
                Prisma.sql`r."storeCode" IN (${Prisma.join(allStoreCodes)})`,
            );
        }
```

Replace it with:

```typescript
        if (allStoreCodes.length > 0) {
            reportPredicates.push(
                Prisma.sql`r."storeCode" IN (${Prisma.join(allStoreCodes)})`,
            );
        } else {
            reportPredicates.push(Prisma.sql`FALSE`);
        }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "fix(admin): use storeCode instead of branchName in getAdminPreventive query"
```

---

### Task 2: Update `getAdminPreventiveKpiData` API

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: `storeCodes` derived from `Store` query
- Produces: Corrected KPI Data that includes stores migrated between branches

- [ ] **Step 1: Remove branchName predicates**

In `app/dashboard/preventive/actions.ts`, locate the `getAdminPreventiveKpiData` function (around line 736). Remove the `user.role === "ADMIN"` conditional block that appends to `reportPredicates`:

```typescript
    if (user.role === "ADMIN") {
        if (branchName && branchName !== "all") {
            reportPredicates.push(Prisma.sql`r."branchName" = ${branchName}`);
        } else {
            reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
        }
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }
```

*Note: You only need to delete this block because the SQL query further down already explicitly includes `AND r."storeCode" IN (${Prisma.join(storeCodes)})`.*

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "fix(admin): remove branchName filter in getAdminPreventiveKpiData to support store branch migration"
```
