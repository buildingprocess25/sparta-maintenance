# PJUM Revision Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix PJUM revision UX and ensure BMC dashboard shows rejected PJUMs

**Architecture:** Add `useEffect` in the PJUM create dialog for auto-fetching eligible reports when in edit mode. Update the `getManagerDashboardData` query to include `REJECTED` status for the BMC role so they see PJUMs that need revision.

**Tech Stack:** React, Next.js, Prisma

## Global Constraints

- Exact file paths always
- Complete code in every step

---

### Task 1: Auto-select reports on PJUM modal open

**Files:**
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: `canSearch`, `isSearching`, `editingPjum`, `open`, `result` states in the dialog.

- [ ] **Step 1: Import `useEffect`**

Update the React imports to include `useEffect`.

```tsx
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
```

- [ ] **Step 2: Add auto-fetch effect**

Add a `useEffect` right before the `return` statement of `CreatePjumDialog` (around line 374, before the `return` statement). This will automatically trigger `handleSearch` when the dialog is opened in edit mode.

```tsx
    useEffect(() => {
        if (open && editingPjum && !result && canSearch && !isSearching) {
            handleSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editingPjum, result, canSearch, isSearching]);

    return (
```

### Task 2: Show revised PJUMs in BMC Dashboard

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: `role` argument in `getManagerDashboardData`.

- [ ] **Step 1: Update `pendingPjum` count query**

Find the `prisma.pjumExport.count` call for `pendingPjum` in `getManagerDashboardData` (around line 402). Change the status filter to include `REJECTED` for BMC.

```typescript
            prisma.pjumExport.count({
                where: {
                    branchName: { in: visibleBranches },
                    status: role === "BMC" ? { in: ["PENDING_APPROVAL", "REJECTED"] } : "PENDING_APPROVAL",
                },
            }),
```

- [ ] **Step 2: Update `pendingPjumRows` findMany query**

Find the `prisma.pjumExport.findMany` call for `pendingPjumRows` in `getManagerDashboardData` (around line 448). Change the status filter to match the count query.

```typescript
            prisma.pjumExport.findMany({
                where: {
                    branchName: { in: visibleBranches },
                    status: role === "BMC" ? { in: ["PENDING_APPROVAL", "REJECTED"] } : "PENDING_APPROVAL",
                },
                orderBy: [{ createdAt: "asc" }, { id: "desc" }],
                take: 5,
                select: {
```

- [ ] **Step 3: Commit changes**

```bash
git add app/dashboard/pjum/_components/create-pjum-dialog.tsx app/dashboard/queries.ts
git commit -m "fix: auto-fetch PJUM reports in edit mode and show rejected PJUMs on BMC dashboard" --no-verify
```
