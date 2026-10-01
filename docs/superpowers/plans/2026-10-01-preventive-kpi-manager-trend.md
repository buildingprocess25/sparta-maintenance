# Preventive KPI Widget Manager Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the `PreventiveKpiWidget` so that users who only have access to a single branch (like BMC and BNM managers) automatically see the Time Trend (Triwulan/Bulan) instead of the useless "5 Cabang Terendah" list.

**Architecture:** We will adjust the frontend React state in `PreventiveKpiWidget`. When the available branches are fetched, if the user only has access to exactly 1 branch, we automatically set the `branchName` state to that branch and remove the "Semua Cabang" option from the dropdown. The existing backend logic in `getAdminPreventiveKpiData` already correctly returns the Time Trend when a specific branch is selected.

**Tech Stack:** Next.js, React

---

### Task 1: Update Frontend Logic in `PreventiveKpiWidget`

**Files:**
- Modify: `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

- [ ] **Step 1: Auto-select single branch on load**

In the `useEffect` that fetches branches:
```typescript
    useEffect(() => {
        getPreventiveBranchOptions().then((branches) => {
            setAvailableBranches(branches);
            if (branches.length === 1) {
                // By defaulting to the specific branch, and because the default 'quarter' 
                // state is already getJakartaCurrentQuarter(), this will automatically
                // trigger the "Tren Penyelesaian per Bulan" view on load.
                setBranchName(branches[0]);
            }
        });
    }, []);
```

- [ ] **Step 2: Hide "Semua Cabang" option if only 1 branch exists**

Update the `<Select>` component for branches:
```typescript
                    <Select 
                        value={branchName} 
                        onValueChange={setBranchName} 
                        disabled={!data || availableBranches.length <= 1}
                    >
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Semua Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableBranches.length !== 1 && (
                                <SelectItem value="all">Semua Cabang</SelectItem>
                            )}
                            {availableBranches.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
```
*Note: We disable the select if `availableBranches.length <= 1` since there's nothing else to choose.*

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/admin/preventive-kpi-widget.tsx
git commit -m "feat: default preventive kpi widget to trend mode for single-branch managers"
```
