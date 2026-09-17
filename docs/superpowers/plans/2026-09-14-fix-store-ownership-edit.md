# Fix Store Ownership Type on Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the issue where store ownership type defaults to 'Regular' when editing, by saving the field correctly in BMC create store action and synchronizing React state on dialog open.

**Architecture:** We will patch the Prisma `create` call in the BMC action to include the missing field. For the frontend, we will introduce a `useEffect` hook in both Admin and BMC dialog components to reliably sync the `editStore` prop into local state whenever the dialog opens.

**Tech Stack:** React, Next.js (App Router), Prisma.

## Global Constraints

- No structural changes to the database schema.
- Follow existing shadcn UI patterns.
- Do not alter the dialog's trigger behavior; simply update state on open.

---

### Task 1: Fix BMC `createStore` action

**Files:**
- Modify: `app/bmc/database/actions.ts`

**Interfaces:**
- Consumes: Prisma `StoreCreateInput`
- Produces: Correctly stored `ownershipType` in the database.

- [ ] **Step 1: Add ownershipType to the create payload**

Modify `app/bmc/database/actions.ts` around line 150 where `prisma.store.create` is called:

```typescript
        await prisma.store.create({
            data: {
                code: payload.code,
                name: payload.name,
                branchName: payload.branchName,
                areaName: normalizedAreaName,
                isActive: payload.isActive ?? true,
                brand,
                ownershipType,
            },
        });
```

- [ ] **Step 2: Commit**

```bash
git add app/bmc/database/actions.ts
git commit -m "fix(bmc): include ownershipType in createStore action"
```

---

### Task 2: Sync React State on Admin Store Form Dialog Open

**Files:**
- Modify: `app/admin/database/_components/store-form-dialog.tsx`

**Interfaces:**
- Consumes: `editStore` prop.

- [ ] **Step 1: Import useEffect**

Add `useEffect` to the React import:

```tsx
import { useState, useTransition, useEffect } from "react";
```

- [ ] **Step 2: Add useEffect to sync state on dialog open**

Inside `AdminStoreFormDialog`, just before the `resetForm` function:

```tsx
    useEffect(() => {
        if (open && isEdit && editStore) {
            setCode(editStore.code);
            setName(editStore.name);
            setBranch(editStore.branchName ?? allBranchNames[0] ?? "");
            setIsActive(editStore.isActive);
            setAreaName(editStore.areaName ?? "");
            setBrand(editStore.brand || "ALFAMART");
            setOwnershipType(getStoreOwnershipFormValue(editStore.ownershipType));
        }
    }, [open, isEdit, editStore, allBranchNames]);

    function resetForm() {
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/database/_components/store-form-dialog.tsx
git commit -m "fix(admin): sync editStore state when dialog opens"
```

---

### Task 3: Sync React State on BMC Store Form Dialog Open

**Files:**
- Modify: `app/bmc/database/_components/store-form-dialog.tsx`

**Interfaces:**
- Consumes: `editStore` prop.

- [ ] **Step 1: Import useEffect**

Add `useEffect` to the React import:

```tsx
import { useState, useTransition, useEffect } from "react";
```

- [ ] **Step 2: Add useEffect to sync state on dialog open**

Inside `StoreFormDialog`, just before the `resetForm` function:

```tsx
    useEffect(() => {
        if (open && isEdit && editStore) {
            setCode(editStore.code);
            setName(editStore.name);
            setBranch(editStore.branchName ?? branchNames[0] ?? "");
            setIsActive(editStore.isActive);
            setAreaName(editStore.areaName ?? null);
            setBrand(editStore.brand || "ALFAMART");
            setOwnershipType(getStoreOwnershipFormValue(editStore.ownershipType));
        }
    }, [open, isEdit, editStore, branchNames]);

    function resetForm() {
```

- [ ] **Step 3: Commit**

```bash
git add app/bmc/database/_components/store-form-dialog.tsx
git commit -m "fix(bmc): sync editStore state when dialog opens"
```
