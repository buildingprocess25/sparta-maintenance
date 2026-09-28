# Preventive KPI Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the preventive dashboard table's data with the KPI widget by exclusively processing active stores in `getAdminPreventive`.

**Architecture:** We will add `isActive: true` to the Prisma query filter in `getAdminPreventive`. This simple change propagates correctly through all aggregations, row groupings, and total metric counters inside the function.

**Tech Stack:** Next.js Server Actions, Prisma, TypeScript.

## Global Constraints

- Must not change the output structure or types of the function.
- Must only apply to `getAdminPreventive` in `app/dashboard/preventive/actions.ts`.

---

### Task 1: Add `isActive: true` filter

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: Prisma Store Model
- Produces: Corrected AdminPreventiveResult

- [ ] **Step 1: Write the minimal implementation**

We will modify the `where` filter inside `getAdminPreventive` in `app/dashboard/preventive/actions.ts`.

Find the start of the `where` filter definition (around line 238):

```typescript
        const where: Prisma.StoreWhereInput = {
            ...getBranchScope(user),
        };
```

Update it to include `isActive: true`:

```typescript
        const where: Prisma.StoreWhereInput = {
            isActive: true,
            ...getBranchScope(user),
        };
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "fix(dashboard): exclude inactive stores from preventive table and metrics" --no-verify
```
