# Dashboard Currency Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify currency formatting on dashboard cards to use full nominal values for millions/billions and decimal shorthand for trillions.

**Architecture:** A centralized formatting function `formatDashboardCurrency` in `lib/utils.ts` will replace inline `Intl.NumberFormat` compact configurations in dashboard cards. Recharts axes remain unchanged to prevent UI overflow.

**Tech Stack:** Next.js, React, Tailwind, TypeScript

## Global Constraints
- Only use `Intl.NumberFormat` compact notation (e.g. `Rp 2,541 T`) for values >= 1 Trillion.
- DO NOT modify chart Y-axes (like in `realisasi-charts.tsx` or `admin-overview-charts.tsx`).

---

### Task 1: Add Centralized Formatter

**Files:**
- Modify: `lib/utils.ts`
- Create: `lib/utils.spec.ts`

**Interfaces:**
- Produces: `formatDashboardCurrency(value: number): string`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect } from "vitest";
import { formatDashboardCurrency } from "./utils";

test("formatDashboardCurrency formats correctly", () => {
    // Under 1T uses full format
    expect(formatDashboardCurrency(3000000)).toBe("Rp 3.000.000");
    expect(formatDashboardCurrency(500000000)).toBe("Rp 500.000.000");
    
    // 1T and above uses compact T format
    expect(formatDashboardCurrency(2541000000000)).toBe("Rp 2,541 T");
    expect(formatDashboardCurrency(-1500000000000)).toBe("-Rp 1,5 T");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils.spec.ts`
Expected: FAIL (formatDashboardCurrency is not exported/defined)

- [ ] **Step 3: Write minimal implementation**

Add to `lib/utils.ts`:
```typescript
export function formatDashboardCurrency(value: number): string {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000_000) {
        const trillions = absValue / 1_000_000_000_000;
        const formatted = new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(trillions);
        return value < 0 ? `-Rp ${formatted} T` : `Rp ${formatted} T`;
    }
    return formatCurrency(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/utils.spec.ts
git commit -m "feat: add formatDashboardCurrency utility"
```

---

### Task 2: Apply Formatter to Manager Dashboard and Realisasi Cards

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`
- Modify: `app/dashboard/realisasi/_components/realisasi-content.tsx`

**Interfaces:**
- Consumes: `formatDashboardCurrency` from `lib/utils.ts`

- [ ] **Step 1: Implement in manager-dashboard.tsx**

Replace `new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short" }).format(value)` calls inside cards/metrics with `formatDashboardCurrency(value)`.
Ensure you import `formatDashboardCurrency` from `@/lib/utils`.

- [ ] **Step 2: Implement in realisasi-content.tsx**

Replace the compact `Intl.NumberFormat` usage for displaying `totalEstimasi`, `totalRealisasi`, and `totalSelisih` with `formatDashboardCurrency`.
Ensure you import `formatDashboardCurrency` from `@/lib/utils`.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds without type errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/_components/manager-dashboard.tsx app/dashboard/realisasi/_components/realisasi-content.tsx
git commit -m "refactor: apply formatDashboardCurrency to manager and realisasi dashboard"
```

---

### Task 3: Apply Formatter to Admin Branches and Branch Detail

**Files:**
- Modify: `app/dashboard/branches/_components/admin-branches-table.tsx`
- Modify: `app/dashboard/branches/[branchName]/page.tsx`

**Interfaces:**
- Consumes: `formatDashboardCurrency` from `lib/utils.ts`

- [ ] **Step 1: Implement in admin-branches-table.tsx**

Replace `new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short" }).format(Number(value))` used for currency columns with `formatDashboardCurrency(Number(value))`.
Ensure you import `formatDashboardCurrency` from `@/lib/utils`.

- [ ] **Step 2: Implement in branchName/page.tsx**

Replace the compact currency formatting in the branch overview cards with `formatDashboardCurrency`.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds without type errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/branches/_components/admin-branches-table.tsx app/dashboard/branches/[branchName]/page.tsx
git commit -m "refactor: apply formatDashboardCurrency to branches table and detail"
```

---

### Task 4: Apply Formatter to BMS Performance and Admin Dashboard

**Files:**
- Modify: `app/dashboard/bms-performance/page.tsx`
- Modify: `app/dashboard/_components/admin/admin-new-dashboard.tsx`

**Interfaces:**
- Consumes: `formatDashboardCurrency` from `lib/utils.ts`

- [ ] **Step 1: Implement in bms-performance/page.tsx**

Replace compact currency formatting in the BMS summary cards with `formatDashboardCurrency`.

- [ ] **Step 2: Implement in admin-new-dashboard.tsx**

Replace compact currency formatting in the Admin overview cards with `formatDashboardCurrency`.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds without type errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/bms-performance/page.tsx app/dashboard/_components/admin/admin-new-dashboard.tsx
git commit -m "refactor: apply formatDashboardCurrency to bms performance and admin dashboard"
```
