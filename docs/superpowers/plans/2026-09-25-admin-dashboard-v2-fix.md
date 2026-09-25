# Admin Dashboard V2 UI Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the main application shell, sidebar, and layout styling for the V2 Dashboard while preserving the dense data grid (Option 1) layout requested by the user.

**Architecture:** 
1. Wrap the existing `AdminDashboardV2` content in `AdminDashboardShell`.
2. Move the `AdminTrendPeriodFilter` to the `headerActions` prop of the Shell, identical to V1.
3. Import and render the `DashboardHeader` component from `./admin-new-dashboard` to restore the "Ringkasan Operasional" header and shortcut buttons.
4. Clean up the grid layout to match the original V1 container padding and spacing (`space-y-6`).

**Tech Stack:** React, Next.js (App Router), Tailwind CSS

## Global Constraints

- Exact file paths always
- Complete code in every step
- Must maintain the existing V2 charts and data bindings, only fixing the layout/wrapper.

---

### Task 1: Refactor V2 Layout Wrapper

**Files:**
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

**Interfaces:**
- Consumes: `AdminDashboardShell`, `AdminTrendPeriodFilter`, `DashboardHeader`.

- [ ] **Step 1: Update imports and the root return block**

Replace the import block and the top half of the component render in `app/dashboard/_components/admin/admin-dashboard-v2.tsx`:

```tsx
// At the top of app/dashboard/_components/admin/admin-dashboard-v2.tsx
// Add the missing layout imports:
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "./admin-trend-filter";
import { DashboardHeader } from "./admin-new-dashboard";
import { StoreBrandFilter, normalizeStoreBrandFilter } from "@/lib/store-brand-filter";

// Then, replace the component's return statement wrapper. 
// Find:
//     return (
//         <div className="space-y-6 pb-12">
//             <div className="flex items-center justify-between">
//                 <h1 className="text-2xl font-bold tracking-tight">Dashboard V2</h1>
//                 <AdminTrendPeriodFilter currentPeriod={period} currentBrand={brand} />
//             </div>
//
// And replace it with:
    
    const selectedPeriod = period ? period : "ytd";
    const selectedBrand = normalizeStoreBrandFilter(brand);

    return (
        <AdminDashboardShell
            user={user}
            title="Dashboard"
            breadcrumbs={[{ label: "Dashboard" }]}
            contentClassName="md:p-6 space-y-6 pb-12"
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={selectedPeriod}
                    initialBrand={selectedBrand}
                    showBrandFilter
                />
            }
        >
            <DashboardHeader kpi={data.kpi} brand={selectedBrand} />

            {/* Row 1: KPI Cards */}
```

- [ ] **Step 2: Close the new wrapper**

Replace the closing `</div>` at the very end of `AdminDashboardV2` with `</AdminDashboardShell>`.

```tsx
// At the end of the file, replace:
//         </div>
//     );
// }
// With:

        </AdminDashboardShell>
    );
}
```
