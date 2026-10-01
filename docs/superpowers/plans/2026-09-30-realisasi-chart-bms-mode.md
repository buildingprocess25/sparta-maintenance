# Realisasi Chart BMS Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Realisasi Chart to display data grouped by BMS (Teknisi) name instead of branch name for BMC/BNM users.

**Architecture:** We will update the `AdminRealisasiDetail` query to aggregate data by `createdBy.name` alongside the existing aggregations. The `RealisasiChartWidget` will receive an optional `mode` prop. When `mode="bms"`, it uses the new `byBMS` array for the chart data, placing BMS names on the X-axis.

**Tech Stack:** Next.js, React, Recharts, Prisma

## Global Constraints

- Must not break the existing "Per Cabang" view used in the Admin dashboard.
- Must correctly scope to the branches queried via `branchScope`.

---

### Task 1: Update Types and Query in `queries.ts`

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Produces: `RealisasiBmsStat` type, `byBMS: RealisasiBmsStat[]` array inside `AdminRealisasiDetail`.

- [ ] **Step 1: Add `RealisasiBmsStat` type and update `AdminRealisasiDetail`**

Modify `app/dashboard/queries.ts` to add the new type:

```typescript
export type RealisasiBmsStat = {
  bmsName: string;
  count: number;
  validCount: number;
  total: number;
  avg: number;
};
```

Update `AdminRealisasiDetail`:
```typescript
export type AdminRealisasiDetail = {
  globalAvg: number;
  totalCompleted: number;
  byBranch: RealisasiBranchStat[];
  byMonth: RealisasiMonthStat[];
  byMonthByBranch: Record<string, RealisasiMonthStat[]>;
  byBMS: RealisasiBmsStat[];
};
```

Also update the `empty` constant inside `getAdminRealisasiDetail`:
```typescript
  const empty: AdminRealisasiDetail = {
    globalAvg: 0,
    totalCompleted: 0,
    byBranch: [],
    byMonth: [],
    byMonthByBranch: {},
    byBMS: [],
  };
```

- [ ] **Step 2: Include `createdBy` in Prisma select**

In `getAdminRealisasiDetail`, update the `select`:
```typescript
      select: { 
        branchName: true, 
        totalReal: true, 
        createdAt: true,
        createdBy: {
          select: { name: true }
        }
      },
```

- [ ] **Step 3: Aggregate data by BMS**

Add `bmsMap`:
```typescript
    const branchMap = new Map<string, number[]>();
    const monthMap = new Map<string, number[]>();
    const branchMonthMap = new Map<string, Map<string, number[]>>();
    const bmsMap = new Map<string, number[]>();
```

In the `for (const r of rows)` loop:
```typescript
      const bmsName = r.createdBy?.name || "Unknown";
      if (!bmsMap.has(bmsName)) bmsMap.set(bmsName, []);
      bmsMap.get(bmsName)!.push(val);
```

After the loop, generate the `byBMS` array:
```typescript
    const byBMS: RealisasiBmsStat[] = Array.from(bmsMap.entries())
      .map(([bmsName, vals]) => {
        const validVals = vals.filter((v) => v >= 1000);
        const totalSum = validVals.reduce((s, v) => s + v, 0);
        return {
          bmsName,
          count: vals.length,
          validCount: validVals.length,
          total: totalSum,
          avg: validVals.length > 0 ? totalSum / validVals.length : 0,
        };
      })
      .sort((a, b) => b.total - a.total); // Sort by highest cost
```

Include it in the return:
```typescript
    return {
      globalAvg,
      totalCompleted,
      byBranch,
      byMonth,
      byMonthByBranch,
      byBMS,
    };
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "feat: add byBMS aggregation to getAdminRealisasiDetail"
```

---

### Task 2: Update `RealisasiChartWidget` to support BMS mode

**Files:**
- Modify: `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

**Interfaces:**
- Consumes: `initialData.byBMS`

- [ ] **Step 1: Add `mode` to Props**

```typescript
type RealisasiChartWidgetProps = {
  initialData: AdminRealisasiDetail;
  brand: StoreBrandFilter;
  mode?: "branch" | "bms";
};
```

Update component signature:
```typescript
export function RealisasiChartWidget({
  initialData,
  brand,
  mode = "branch",
}: RealisasiChartWidgetProps) {
```

- [ ] **Step 2: Compute Data based on mode**

```typescript
  const chartData = mode === "bms" ? data.byBMS : data.byBranch;
  
  // Sort conditionally
  const sortedData = [...chartData].sort((a: any, b: any) => {
    if (mode === "bms") {
      // already sorted by total cost from backend, or we can sort by name
      return a.bmsName.localeCompare(b.bmsName);
    }
    return a.branchName.localeCompare(b.branchName);
  });
```

- [ ] **Step 3: Update JSX Labels and Export logic**

Change the title description conditionally:
```typescript
            <p className="text-sm text-muted-foreground mt-1">
              Perbandingan antara total jumlah laporan dan rata-rata realisasi
              biaya per laporan di setiap {mode === "bms" ? "BMS/Teknisi" : "cabang"}
            </p>
```

Update Export rows:
```typescript
                const rows = sortedData.map((item: any) => ({
                  [mode === "bms" ? "BMS" : "Cabang"]: mode === "bms" ? item.bmsName : item.branchName,
                  "Jumlah Laporan (Total)": item.count,
                  "Jumlah Laporan (Ada Biaya)": item.validCount,
                  "Total Realisasi": item.total,
                  "Rata-Rata Biaya": item.avg,
                }));
```

Update `XAxis` `dataKey`:
```typescript
            <XAxis
              dataKey={mode === "bms" ? "bmsName" : "branchName"}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/_components/admin/realisasi-chart-widget.tsx
git commit -m "feat: add bms mode to RealisasiChartWidget"
```

---

### Task 3: Update `ManagerDashboard` to pass mode="bms"

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`

- [ ] **Step 1: Pass `mode="bms"` to Widget**

Find `RealisasiChartWidget` in `app/dashboard/_components/manager-dashboard.tsx` and add the prop:

```typescript
            <div className="mt-6">
                <RealisasiChartWidget initialData={realisasiData} brand={resolvedBrand} mode="bms" />
            </div>
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/manager-dashboard.tsx
git commit -m "feat: enable bms mode on manager realisasi chart"
```
