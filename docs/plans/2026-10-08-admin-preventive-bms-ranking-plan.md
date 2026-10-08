# Admin Preventive KPI Widget - BMS Ranking on Branch Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Checklist Preventif widget view on the Admin Dashboard so that selecting a specific branch displays the Top 5 / Bottom 5 BMS ranking for that branch instead of the monthly completion trend.

**Architecture:** Update `getAdminPreventiveKpiData` server action in `app/dashboard/preventive/actions.ts` to set `viewMode = "BMS"` whenever a specific branch filter (`branchName !== "all"`) is selected (or when the user is a BMC/BNM manager). The existing `PreventiveKpiWidget` component already supports `viewMode === "BMS"` and will render ranking numbers, top/bottom toggle, and identical narratives to the manager view.

**Tech Stack:** Next.js App Router, Prisma ORM, TypeScript, React Server Actions.

## Global Constraints

- Preserve existing behavior when branch filter is set to "Semua Cabang" (`branchName === "all"`).
- Narrative and toggle UI must strictly match the BMC/BNM manager view ("BMS Preventif Terbaik" / "BMS Preventif Terburuk").
- Build verification must pass using `npm run build:memory` without type errors or broken references.
- Create dated task note in `docs/agent-notes/` upon completion per project rules in `AGENTS.md`.

---

### Task 1: Update Server Action `getAdminPreventiveKpiData`

**Files:**
- Modify: `app/dashboard/preventive/actions.ts:760-835`

**Interfaces:**
- Consumes: `year: number`, `quarter: PreventiveQuarter | "all"`, `branchName?: string`
- Produces: `PreventiveKpiData` object with `viewMode: "BMS"`, `allBmsItems`, `listItems`, `listTitle: "BMS Preventif Terbaik"` when `branchName && branchName !== "all"`.

- [ ] **Step 1: Modify `getAdminPreventiveKpiData` logic in `app/dashboard/preventive/actions.ts`**

Update the BMS view condition so that `showBmsView` triggers if `isManager` OR if a specific branch is selected (`branchName && branchName !== "all"`):

```typescript
const showBmsView = isManager || (branchName && branchName !== "all");

if (showBmsView) {
    viewMode = "BMS";
    
    const branchFilter = (branchName && branchName !== "all")
        ? branchName
        : { in: user.branchNames };
        
    const assignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            isActive: true,
            store: {
                isActive: true,
                branchName: branchFilter,
            },
        },
        select: {
            storeCode: true,
            bmsNIK: true,
            bms: {
                select: {
                    NIK: true,
                    name: true,
                },
            },
        },
    });

    const bmsGroupMap = new Map<string, { label: string; total: number; completed: number }>();
    for (const a of assignments) {
        const bmsName = a.bms?.name || a.bmsNIK;
        const current = bmsGroupMap.get(a.bmsNIK) || {
            label: bmsName,
            total: 0,
            completed: 0,
        };
        current.total++;
        if (completedStores.has(a.storeCode)) {
            current.completed++;
        }
        bmsGroupMap.set(a.bmsNIK, current);
    }

    const allBmsItems = Array.from(bmsGroupMap.values())
        .filter((item) => item.total > 0)
        .map((item) => ({
            label: item.label,
            completed: item.completed,
            total: item.total,
            percentage: calculateRate(item.completed, item.total),
        }))
        .sort((a, b) => b.percentage - a.percentage);

    listTitle = "BMS Preventif Terbaik";
    allBmsItemsForReturn = allBmsItems;
    listItems = allBmsItems.slice(0, 5);
} else if (!branchName || branchName === "all") {
    // Branch view logic ...
}
```

- [ ] **Step 2: Verify type correctness**

Run build or typecheck to confirm zero TypeScript errors in `actions.ts`.

---

### Task 2: Build & Empirical Verification

**Files:**
- None (Execution of project build verification)

- [ ] **Step 1: Execute `npm run build:memory`**

Run: `npm run build:memory`
Expected: Exit code 0 with successful build.

---

### Task 3: Documentation Task Note & Task Tracker Update

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-admin-preventive-bms-ranking.md`
- Modify: `docs/plans/task.md`

- [ ] **Step 1: Update `docs/plans/task.md`**

Mark all tasks as completed in `docs/plans/task.md`.

- [ ] **Step 2: Create Task Note in `docs/agent-notes/`**

Create task note following `docs/agent-notes/TEMPLATE.md` with Asia/Jakarta timestamp.
