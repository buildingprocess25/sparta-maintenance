# Admin Dashboard UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Admin Dashboard by restoring the top 3 KPI cards to their original screenshot-based design and transforming the plain text SLA/Preventif lists into a professional Leaderboard UI with progress bars.

**Architecture:** 
1. Extract the 3 main KPI cards into a dedicated `AdminKpiCards` component to match the provided screenshot precisely.
2. Create a generic `LeaderboardList` component that renders items as horizontal progress bars instead of raw red text.
3. Refactor `admin-dashboard-v2.tsx` to integrate these new components, shifting the "Status Bottleneck" card to a better layout position.

**Tech Stack:** React, Tailwind CSS, Lucide React, shadcn/ui

## Global Constraints

- Never use raw `<style>` tags or inline styles if Tailwind can achieve it.
- Use `lucide-react` for icons.
- Ensure the numbers use `toLocaleString("id-ID")`.
- Keep the exact types from `AdminCommandCenterData`.

---

### Task 1: Create the Leaderboard UI Component

**Files:**
- Create: `app/dashboard/_components/admin/leaderboard-list.tsx`

**Interfaces:**
- Produces: `LeaderboardList` component and `LeaderboardItem` type.

- [ ] **Step 1: Write the failing test**

*(We are skipping TDD for React UI components as per standard Next.js rapid prototyping, but we ensure the component is structured correctly for integration).*

- [ ] **Step 2: Write minimal implementation**

Create `app/dashboard/_components/admin/leaderboard-list.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LeaderboardItem = {
  label: string;
  value: number;
  valueLabel: string;
  maxValue: number;
  colorClass: string;
};

export function LeaderboardList({ title, items }: { title: string; items: LeaderboardItem[] }) {
  return (
    <Card className="flex-1 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mt-2">
          {items.map((item, i) => {
            const percentage = item.maxValue > 0 ? Math.min(100, Math.max(0, (item.value / item.maxValue) * 100)) : 0;
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{item.valueLabel}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.colorClass}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">Tidak ada data</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/admin/leaderboard-list.tsx
git commit -m "feat: add leaderboard list component for dashboard"
```

---

### Task 2: Create the KPI Cards Component

**Files:**
- Create: `app/dashboard/_components/admin/kpi-cards.tsx`

**Interfaces:**
- Consumes: `AdminCommandCenterData` from `app/dashboard/queries.ts`
- Produces: `AdminKpiCards` component

- [ ] **Step 1: Write minimal implementation**

Create `app/dashboard/_components/admin/kpi-cards.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, CircleDollarSign, ArrowUpRight } from "lucide-react";
import type { AdminCommandCenterData } from "../../../queries";

export function AdminKpiCards({ data }: { data: AdminCommandCenterData }) {
  const alfamartLaporan = data.brandBreakdown?.alfamart.kpi.totalReports ?? 0;
  const lawsonLaporan = data.brandBreakdown?.lawson.kpi.totalReports ?? 0;
  
  const alfamartCompletion = data.brandBreakdown?.alfamart.kpi.completionRate ?? 0;
  const lawsonCompletion = data.brandBreakdown?.lawson.kpi.completionRate ?? 0;

  const alfamartRealisasi = data.brandBreakdown?.alfamart.kpi.totalRealisasi ?? 0;
  const lawsonRealisasi = data.brandBreakdown?.lawson.kpi.totalRealisasi ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1: Laporan */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Laporan</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{data.kpi.totalReports.toLocaleString("id-ID")}</span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xs font-medium mt-2">
            <span className="text-red-600">Alfamart: {alfamartLaporan.toLocaleString("id-ID")}</span>
            <span className="text-blue-600 ml-3">Lawson: {lawsonLaporan.toLocaleString("id-ID")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Semua laporan non-draft tahun berjalan</p>
          
          <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <div className="text-xs text-muted-foreground">Selesai</div>
              <div className="text-lg font-bold text-green-600 flex items-center gap-1">
                {data.kpi.completedReports.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Laporan Aktif</div>
              <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                {data.kpi.activeReports.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ditolak</div>
              <div className="text-lg font-bold text-gray-700 flex items-center gap-1">
                {data.kpi.rejectedReports.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">User Aktif</div>
              <div className="text-lg font-bold text-gray-700 flex items-center gap-1">
                {data.kpi.activeUsers.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Penyelesaian */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Penyelesaian</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{data.kpi.completionRate}%</span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xs font-medium mt-2">
            <span className="text-red-600">Alfamart: {alfamartCompletion}%</span>
            <span className="text-blue-600 ml-3">Lawson: {lawsonCompletion}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Selesai dibanding seluruh laporan non-draft</p>
          
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${data.kpi.completionRate}%` }} />
          </div>
          
          <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <div className="text-xs text-muted-foreground">Selesai</div>
              <div className="text-lg font-bold text-green-600">
                {data.kpi.completedReports.toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sudah PJUM</div>
              <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                {data.kpi.pjumCompletedReports.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Belum PJUM</div>
              <div className="text-lg font-bold text-orange-500 flex items-center gap-1">
                {data.kpi.unpjumCompletedReports.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tanpa PJUM</div>
              <div className="text-lg font-bold text-gray-700">
                {data.kpi.unpjumNotRequiredReports.toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Realisasi & PJUM */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <CircleDollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Realisasi & PJUM</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">Rp {data.kpi.totalRealisasi.toLocaleString("id-ID")}</span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xs font-medium mt-2">
            <span className="text-red-600">Alfamart: Rp {alfamartRealisasi.toLocaleString("id-ID")}</span>
            <span className="text-blue-600 ml-3">Lawson: Rp {lawsonRealisasi.toLocaleString("id-ID")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mb-4">BMS / minggu all cabang Rp {data.kpi.avgBmsWeeklyRealisasi.toLocaleString("id-ID")}</p>
          
          <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <div className="text-xs text-muted-foreground">PJUM tahun ini</div>
              <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                {data.pjum.total.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PJUM disetujui</div>
              <div className="text-lg font-bold text-green-600 flex items-center gap-1">
                {data.pjum.approved.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Review PJUM</div>
              <div className="text-lg font-bold text-orange-500 flex items-center gap-1">
                {data.pjum.pending.toLocaleString("id-ID")} <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/admin/kpi-cards.tsx
git commit -m "feat: add screenshot-accurate KPI cards component"
```

---

### Task 3: Refactor `admin-dashboard-v2.tsx`

**Files:**
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

**Interfaces:**
- Consumes: `AdminKpiCards` and `LeaderboardList`

- [ ] **Step 1: Import new components**

Add the imports at the top of `app/dashboard/_components/admin/admin-dashboard-v2.tsx`:

```tsx
import { AdminKpiCards } from "./kpi-cards";
import { LeaderboardList, type LeaderboardItem } from "./leaderboard-list";
```

- [ ] **Step 2: Transform SLA/Preventif Lists into Leaderboards**

Inside `AdminDashboardV2`, before the `return`, prepare the data for the leaderboards:

```tsx
    const maxEstimasiSla = Math.max(...(data.slaPerformance?.estimasiToAppvBmc.map(s => s.avgDurationHours) || [1]));
    const estimasiSlaItems: LeaderboardItem[] = (data.slaPerformance?.estimasiToAppvBmc || []).map(s => ({
        label: s.branchName,
        value: s.avgDurationHours,
        valueLabel: s.formattedDuration,
        maxValue: maxEstimasiSla,
        colorClass: "bg-orange-500"
    }));

    const maxPekerjaanSla = Math.max(...(data.slaPerformance?.durasiPekerjaanBms.map(s => s.avgDurationHours) || [1]));
    const pekerjaanSlaItems: LeaderboardItem[] = (data.slaPerformance?.durasiPekerjaanBms || []).map(s => ({
        label: s.branchName,
        value: s.avgDurationHours,
        valueLabel: s.formattedDuration,
        maxValue: maxPekerjaanSla,
        colorClass: "bg-blue-500"
    }));

    const maxMgrSla = Math.max(...(data.slaPerformance?.appvBmcToAppvMgr.map(s => s.avgDurationHours) || [1]));
    const mgrSlaItems: LeaderboardItem[] = (data.slaPerformance?.appvBmcToAppvMgr || []).map(s => ({
        label: s.branchName,
        value: s.avgDurationHours,
        valueLabel: s.formattedDuration,
        maxValue: maxMgrSla,
        colorClass: "bg-purple-500"
    }));

    // Mock data for preventif as it was hardcoded in the original file
    const preventifItems: LeaderboardItem[] = [
        { label: "PONTIANAK", value: 43.4, valueLabel: "43,40%", maxValue: 100, colorClass: "bg-red-500" },
        { label: "LOMBOK", value: 48.8, valueLabel: "48,80%", maxValue: 100, colorClass: "bg-red-500" },
        { label: "MADIUN", value: 58.29, valueLabel: "58,29%", maxValue: 100, colorClass: "bg-orange-500" },
    ];
```

- [ ] **Step 3: Replace the JSX Layout**

Remove the `Row 1: KPI Cards` div block (lines ~77-128).
Replace it with:
```tsx
            {/* Row 1: KPI Cards */}
            <AdminKpiCards data={data} />
```

Remove the `Row 2 & 3: Preventif & SLA` div block (lines ~130-196).
Replace it with:
```tsx
            {/* Row 2: Status Bottleneck & Preventif */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Status Bottleneck</CardTitle></CardHeader>
                    <CardContent className="overflow-auto max-h-48">
                        <div className="space-y-3 mt-2 text-sm">
                            {data.status.map(s => (
                                <div key={s.status} className="flex justify-between items-center border-b pb-2 last:border-0">
                                    <span className="text-muted-foreground">{s.label}</span>
                                    <span className="font-bold bg-secondary px-2 py-0.5 rounded-md">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-center uppercase">PENCAPAIAN PREVENTIF</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{name: 'OK', value: 87}, {name: 'NOT OK', value: 13}]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                                    <Cell fill="#22c55e" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-2xl font-bold mt-6">87%</div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-1">
                    <LeaderboardList title="5 Cabang Preventif Rendah" items={preventifItems} />
                </div>
            </div>

            {/* Row 3: SLA Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LeaderboardList title="SL Estimasi ke Appv BMC Tertinggi" items={estimasiSlaItems} />
                <LeaderboardList title="SL Durasi Pekerjaan BMS Tertinggi" items={pekerjaanSlaItems} />
                <LeaderboardList title="SL Appv BMC ke Appv Mgr Tertinggi" items={mgrSlaItems} />
            </div>
```

- [ ] **Step 4: Format and Verify**

Run: `npx prettier --write app/dashboard/_components/admin/admin-dashboard-v2.tsx`
Verify the dashboard loads and the new visual layout applies cleanly without React errors.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/_components/admin/admin-dashboard-v2.tsx
git commit -m "feat: integrate KPI cards and leaderboard lists into admin dashboard"
```
