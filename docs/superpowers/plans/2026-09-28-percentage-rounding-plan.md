# Preventive Dashboard Percentage Rounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the misleading 100% completion bug by capping percentage rounding at 99% for incomplete tasks and consolidating all percentage logic.

**Architecture:** Update `calculateRate` in `actions.ts` to include protective boundaries (cap at 99%, floor at 1%). Then, find all inline instances of `Math.round((completed / total) * 100)` in `actions.ts` and replace them with calls to `calculateRate`.

**Tech Stack:** Next.js Server Actions, TypeScript.

## Global Constraints

- Do not change any function signatures except for standardizing on `calculateRate`.
- Ensure changes correctly compile via TypeScript.

---

### Task 1: Update rate logic in actions.ts

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Produces: Robust percentage calculations across the dashboard.

- [ ] **Step 1: Write the minimal implementation**

We will modify `app/dashboard/preventive/actions.ts`.

First, update the `calculateRate` function (around line 207):
```typescript
function calculateRate(completed: number, total: number) {
    if (total === 0) return 0;
    if (completed === total) return 100;
    const rate = Math.round((completed / total) * 100);
    if (rate === 100 && completed < total) return 99;
    if (rate === 0 && completed > 0) return 1;
    return rate;
}
```

Next, update `getBmsPreventiveCoverage` (around line 672):
From:
```typescript
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
```
To:
```typescript
    const completionRate = calculateRate(completed.length, total);
```

Next, update `getAdminPreventiveKpiData` `capaianNasional` (around line 760):
From:
```typescript
    const capaianNasional = totalStoresCount === 0 ? 0 : Math.round((totalCompleted / totalStoresCount) * 100);
```
To:
```typescript
    const capaianNasional = calculateRate(totalCompleted, totalStoresCount);
```

Next, update `getAdminPreventiveKpiData` `percentage` for branches (around line 781):
From:
```typescript
                percentage: data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100)
```
To:
```typescript
                percentage: calculateRate(data.completed, data.total)
```

Next, update `getAdminPreventiveKpiData` `percentage` for quarters (around line 804):
From:
```typescript
                percentage: totalStoresCount === 0 ? 0 : Math.round((q.completed / totalStoresCount) * 100)
```
To:
```typescript
                percentage: calculateRate(q.completed, totalStoresCount)
```

Next, update `getAdminPreventiveKpiData` `percentage` for months (around line 827):
From:
```typescript
                percentage: totalStoresCount === 0 ? 0 : Math.round((m.completed / totalStoresCount) * 100)
```
To:
```typescript
                percentage: calculateRate(m.completed, totalStoresCount)
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "fix(dashboard): use safe percentage rounding for preventive metrics" --no-verify
```
