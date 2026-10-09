# Fix Admin Dashboard User Stats Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the bottom card user statistics (BMS, BMC, Manager Cabang, Total Tim Cabang) on the Admin Dashboard (`/dashboard`) strictly count active users belonging to operational branches, excluding `HEAD OFFICE` and empty branch assignments.

**Architecture:** Update `getAdminCommandCenterData()` query in `app/dashboard/queries.ts` to add non-HO and non-empty branch filters (`NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } }` and `branchNames: { isEmpty: false }`) to `prisma.user.count()` for roles `BMS`, `BMC`, and `BNM_MANAGER`.

**Tech Stack:** Next.js Server Actions / Data Fetching, Prisma ORM

---

### Task 1: Filter Non-HO and Active Branches for Admin User Stats

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Prisma `user.count` for `BMS`, `BMC`, `BNM_MANAGER`
- Produces: Correct non-HO user counts for `totalBms`, `totalBmc`, `totalManager`, and `totalTimCabang`.

- [ ] **Step 1: Update user count queries in getAdminCommandCenterData**

In `app/dashboard/queries.ts`, update lines 1620-1622 to add `branchNames: { isEmpty: false }` and `NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } }` to `prisma.user.count` for `BMS`, `BMC`, and `BNM_MANAGER`.

```typescript
    const [slaPerformance, totalStoreAlfamart, totalStoreLawson, totalBms, totalBmc, totalManager] = await Promise.all([
      getAdminSlaPerformanceData(trendWindow, brand, branchScope),
      prisma.store.count({ where: { brand: "ALFAMART", isActive: true, NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } } }),
      prisma.store.count({ where: { brand: "LAWSON", isActive: true, NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } } }),
      prisma.user.count({
        where: {
          role: "BMS",
          deletedAt: null,
          branchNames: { isEmpty: false },
          NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
        },
      }),
      prisma.user.count({
        where: {
          role: "BMC",
          deletedAt: null,
          branchNames: { isEmpty: false },
          NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
        },
      }),
      prisma.user.count({
        where: {
          role: "BNM_MANAGER",
          deletedAt: null,
          branchNames: { isEmpty: false },
          NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
        },
      }),
    ]);
```

- [ ] **Step 2: Typecheck and build verification**

Run `npx tsc --noEmit` to verify type safety.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "fix(dashboard): filter out head office and empty branch users in admin user stats"
```
