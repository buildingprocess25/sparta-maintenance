# Admin Dashboard Improvement (5 Poin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan export XLSX + memperbaiki tooltip + merapikan margin pada grafik Realisasi, memperkecil 5 card footer, dan menambahkan kolom "Jumlah Laporan" pada export SLA Proses di halaman Performa Cabang.

**Architecture:** Semua perubahan bersifat UI/presentasi murni kecuali Task 1 (butuh field `total` baru di type `RealisasiBranchStat` dan query builder-nya), serta Task 5 (butuh field `reportCount` baru di type `SLADurationBMS` dan raw SQL query-nya). Tidak ada perubahan skema Prisma/database.

**Tech Stack:** Next.js 14+ App Router, React 19, TypeScript, Recharts, shadcn/ui, xlsx (sudah terinstall)

## Global Constraints

- Tidak ada schema Prisma baru — hanya perubahan pada TypeScript types dan query logic.
- Pertahankan semua `font-size`, `font-weight`, dan `font-style` pada 5 card footer — hanya padding-Y yang boleh berubah.
- Format Rupiah menggunakan `.toLocaleString("id-ID")`.
- Tambahkan kolom baru XLSX di posisi yang tepat (antara "Nama BMS" dan kolom durasi pertama).
- Tidak ada `console.log` yang tertinggal di production code.
- Semua perubahan di branch `feature/admin-dashboard-v2`.

---

## Task 1: Tambahkan Field `total` di `RealisasiBranchStat` + Query Builder

**Files:**
- Modify: `app/dashboard/queries.ts:1976-1982` (type `RealisasiBranchStat`)
- Modify: `app/dashboard/queries.ts:2090-2106` (builder `byBranch`)

**Interfaces:**
- Produces: `RealisasiBranchStat.total: number` — total sum dari `validVals` (nilai `totalReal >= 1000`), digunakan oleh Task 2 dan Task 3.

---

- [ ] **Step 1: Tambahkan field `total` pada type `RealisasiBranchStat`**

Di `app/dashboard/queries.ts` baris 1976-1982, ubah type menjadi:

```typescript
export type RealisasiBranchStat = {
  branchName: string;
  count: number;
  total: number;   // field baru: sum total realisasi (hanya validVals >= 1000)
  avg: number;
  max: number;
  min: number;
};
```

- [ ] **Step 2: Isi field `total` di builder `byBranch`**

Di `app/dashboard/queries.ts` baris 2090-2106, ubah builder menjadi:

```typescript
const byBranch: RealisasiBranchStat[] = Array.from(branchMap.entries())
  .map(([branchName, vals]) => {
    const validVals = vals.filter((v) => v >= 1000);
    const totalSum = validVals.reduce((s, v) => s + v, 0);
    return {
      branchName,
      count: vals.length,
      total: totalSum,
      avg:
        validVals.length > 0
          ? Math.round(totalSum / validVals.length)
          : 0,
      max: vals.length > 0 ? Math.max(...vals) : 0,
      min: vals.length > 0 ? Math.min(...vals) : 0,
    };
  })
  .sort((a, b) => b.avg - a.avg);
```

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```powershell
npx tsc --noEmit
```

Expected: tidak ada error baru pada `queries.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/queries.ts
git commit -m "feat(queries): add total field to RealisasiBranchStat"
```

---

## Task 2: Tambah "Total Realisasi" di Tooltip Chart Realisasi

**Files:**
- Modify: `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

**Interfaces:**
- Consumes: `RealisasiBranchStat.total: number` dari Task 1
- Produces: tooltip yang menampilkan urutan: Jumlah Laporan -> Total Realisasi -> Rata-Rata Biaya

---

- [ ] **Step 1: Tambahkan `total` ke config chart**

Di `realisasi-chart-widget.tsx`, ubah `ChartContainer config`:

```tsx
<ChartContainer
  config={{
    count: { label: "Jumlah Laporan", color: "var(--chart-3)" },
    total: { label: "Total Realisasi", color: "var(--chart-2)" },
    avg: { label: "Rata-Rata Biaya", color: "#f4bb44" },
  }}
  className="h-full w-full"
>
```

- [ ] **Step 2: Ubah formatter tooltip agar menangani 3 key**

Ubah `formatter` pada `ChartTooltipContent`:

```tsx
formatter={(value, name) => (
  <div className="flex w-full justify-between items-center gap-4">
    <span className="text-muted-foreground text-xs">
      {name === "avg"
        ? "Rata-Rata Biaya"
        : name === "total"
        ? "Total Realisasi"
        : "Jumlah Laporan"}
    </span>
    <span className="font-mono font-medium text-xs">
      {name === "avg" || name === "total"
        ? `Rp ${Number(value).toLocaleString("id-ID")}`
        : value}
    </span>
  </div>
)}
```

- [ ] **Step 3: Tambahkan hidden Line untuk `total` (agar urutan tooltip terjaga)**

Recharts merender baris tooltip sesuai urutan `dataKey` yang terdaftar di JSX. Tambahkan `Line` tersembunyi untuk `total` **di antara** `<Bar count>` dan `<Line avg>`:

```tsx
<Bar
  yAxisId="right"
  dataKey="count"
  fill="var(--color-count)"
  radius={[4, 4, 0, 0]}
  barSize={32}
/>
{/* Hidden line — hanya untuk mengatur urutan tooltip: count -> total -> avg */}
<Line
  yAxisId="left"
  type="monotone"
  dataKey="total"
  stroke="transparent"
  strokeWidth={0}
  dot={false}
  activeDot={false}
  legendType="none"
/>
<Line
  yAxisId="left"
  type="monotone"
  dataKey="avg"
  stroke="var(--color-avg)"
  strokeWidth={3}
  dot={false}
  activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-avg)" }}
/>
```

- [ ] **Step 4: Uji di browser**

Hover salah satu bar di grafik. Tooltip harus menampilkan 3 baris dengan urutan:
1. Jumlah Laporan: `<angka>`
2. Total Realisasi: `Rp <angka>`
3. Rata-Rata Biaya: `Rp <angka>`

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/_components/admin/realisasi-chart-widget.tsx
git commit -m "feat(dashboard): add total realisasi to chart tooltip"
```

---

## Task 3: Kecilkan Bottom Margin Chart + Tambah Export XLSX

**Files:**
- Modify: `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

**Interfaces:**
- Consumes: `RealisasiBranchStat` (termasuk `total` dari Task 1, `count`, `avg`)
- Produces: tombol "Export XLSX" di header chart; file `Realisasi_Per_Laporan_SPARTA.xlsx` saat diklik

---

- [ ] **Step 1: Kurangi margin bottom dan height XAxis**

Di `realisasi-chart-widget.tsx`, ubah props `ComposedChart` dan `XAxis`:

```tsx
<ComposedChart
  data={sortedData}
  margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
>
  ...
  <XAxis
    dataKey="branchName"
    angle={-45}
    textAnchor="end"
    height={60}
    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
    tickLine={false}
    axisLine={false}
    dy={10}
  />
```

- [ ] **Step 2: Tambahkan import `Download`, `XLSX`, dan `Button`**

Tambahkan di baris import atas file:

```tsx
import { Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 3: Tambahkan fungsi `handleExport` di dalam komponen**

Tambahkan sebelum `return`, setelah deklarasi `sortedData`:

```tsx
const handleExport = () => {
  const rows = sortedData.map((item) => ({
    Cabang: item.branchName,
    "Jumlah Laporan": item.count,
    "Total Rp Realisasi": item.total,
    "Avg Rp Realisasi": item.avg,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Realisasi Per Laporan");
  XLSX.writeFile(workbook, "Realisasi_Per_Laporan_SPARTA.xlsx");
};
```

- [ ] **Step 4: Tambahkan tombol di header, sejajar dengan Select periode**

Ubah baris `<Select>` di dalam `CardHeader` menjadi grup:

```tsx
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={handleExport}
    disabled={sortedData.length === 0 || isPending}
    className="h-9 text-xs"
  >
    <Download className="mr-2 h-3.5 w-3.5" />
    Export XLSX
  </Button>
  <Select value={period} onValueChange={setPeriod}>
    <SelectTrigger className="w-[150px] h-9 text-xs">
      <SelectValue placeholder="Pilih Periode" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ytd">YTD (Tahun Ini)</SelectItem>
      <SelectItem value="Q1">Triwulan 1</SelectItem>
      <SelectItem value="Q2">Triwulan 2</SelectItem>
      <SelectItem value="Q3">Triwulan 3</SelectItem>
      <SelectItem value="Q4">Triwulan 4</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 5: Uji di browser**

1. Margin bawah grafik harus lebih rapat; label cabang miring tetap terbaca penuh.
2. Klik tombol "Export XLSX" → file `Realisasi_Per_Laporan_SPARTA.xlsx` diunduh.
3. Buka file: harus ada 4 kolom: `Cabang | Jumlah Laporan | Total Rp Realisasi | Avg Rp Realisasi`.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/_components/admin/realisasi-chart-widget.tsx
git commit -m "feat(dashboard): add XLSX export and reduce bottom margin on realisasi chart"
```

---

## Task 4: Kecilkan Padding-Y pada 5 Card Footer Stats

**Files:**
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx` (5 blok `<CardContent>` dalam `{/* Footer Stats */}`)

**Interfaces:**
- Tidak ada interface baru; perubahan murni CSS class.

---

- [ ] **Step 1: Ubah `p-6` menjadi `px-6 py-3` pada semua 5 CardContent footer**

Cari 5 blok `<CardContent className="flex flex-col items-center justify-center p-6 flex-1 text-center">` di dalam bagian Footer Stats dan ubah semua menjadi:

```tsx
<CardContent className="flex flex-col items-center justify-center px-6 py-3 flex-1 text-center">
```

> Keterangan: `p-6` = 24px semua sisi. Perubahan ke `px-6 py-3` mempertahankan horizontal padding 24px tapi mengurangi vertical padding dari 24px menjadi 12px. Font, ukuran teks, dan semua isi di dalam card tidak berubah.

- [ ] **Step 2: Verifikasi di browser**

5 card harus terlihat lebih pendek/ramping. Semua konten (label uppercase kecil, angka besar `font-black`, breakdown brand) harus identik dengan sebelumnya.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/admin/admin-dashboard-v2.tsx
git commit -m "style(dashboard): reduce vertical padding on footer stat cards"
```

---

## Task 5: Tambah Kolom "Jumlah Laporan" di XLSX Export SLA Proses

**Files:**
- Modify: `app/dashboard/branches/actions.ts:810-956`
- Modify: `app/dashboard/branches/_components/admin-sla-table.tsx:37-72`

**Interfaces:**
- Produces: `SLADurationBMS.reportCount: number`
- Produces: `SLADurationBranch.reportCount: number`
- Produces: kolom `"JUMLAH LAPORAN"` di XLSX setelah kolom `"Nama BMS"`.

---

- [ ] **Step 1: Tambahkan `reportCount` pada type `SLADurationBMS`**

Di `app/dashboard/branches/actions.ts`, cari type `SLADurationBMS` (sekitar baris 810-826):

```typescript
export type SLADurationBMS = {
  bmsName: string;
  reportCount: number;    // jumlah laporan yang masuk dalam kalkulasi avg durasi BMS ini
  estimasiToAppvBMC: number | null;
  estimasiToRevisiBMC: number | null;
  appvBMCToWorkStart: number | null;
  workStartToRealisasi: number | null;
  realisasiToRevisiBMC: number | null;
  realisasiToAppvBMC: number | null;
  appvBMCToAppvMGR: number | null;
};
```

- [ ] **Step 2: Tambahkan `reportCount` pada type `SLADurationBranch`**

Di baris 827-837:

```typescript
export type SLADurationBranch = {
  branchName: string;
  reportCount: number;    // total laporan di cabang ini
  bmsList: SLADurationBMS[];
  estimasiToAppvBMC: number | null;
  estimasiToRevisiBMC: number | null;
  appvBMCToWorkStart: number | null;
  workStartToRealisasi: number | null;
  realisasiToRevisiBMC: number | null;
  realisasiToAppvBMC: number | null;
  appvBMCToAppvMGR: number | null;
};
```

- [ ] **Step 3: Tambahkan `COUNT(*)` di raw SQL query**

Di dalam `getAdminDetailedSLAData`, ubah TypeScript generic type pada `prisma.$queryRaw`:

```typescript
const rows = await prisma.$queryRaw<{
  branchName: string;
  bmsName: string | null;
  report_count: bigint;          // COUNT() Postgres mengembalikan bigint
  avg_est_to_appv_bmc: number | null;
  avg_est_to_rev_bmc: number | null;
  avg_appv_bmc_to_start: number | null;
  avg_start_to_realisasi: number | null;
  avg_realisasi_to_rev_bmc: number | null;
  avg_realisasi_to_appv_bmc: number | null;
  avg_appv_bmc_to_mgr: number | null;
}[]>`
```

Tambahkan `COUNT(*) AS report_count` ke dalam SELECT bagian luar query (setelah `"bmsName"`):

```sql
SELECT 
    "branchName",
    "bmsName",
    COUNT(*) AS report_count,
    AVG(EXTRACT(EPOCH FROM (t_est_appv - t_submit))) AS avg_est_to_appv_bmc,
    AVG(EXTRACT(EPOCH FROM (t_est_rev - t_submit))) AS avg_est_to_rev_bmc,
    AVG(EXTRACT(EPOCH FROM (t_start - t_est_appv))) AS avg_appv_bmc_to_start,
    AVG(EXTRACT(EPOCH FROM (t_realisasi - t_start))) AS avg_start_to_realisasi,
    AVG(EXTRACT(EPOCH FROM (t_real_rev - t_realisasi))) AS avg_realisasi_to_rev_bmc,
    AVG(EXTRACT(EPOCH FROM (t_real_appv - t_realisasi))) AS avg_realisasi_to_appv_bmc,
    AVG(EXTRACT(EPOCH FROM (t_mgr_appv - t_real_appv))) AS avg_appv_bmc_to_mgr
FROM report_events
GROUP BY GROUPING SETS (
    ("branchName"),
    ("branchName", "bmsName")
)
ORDER BY "branchName", "bmsName" NULLS FIRST
```

- [ ] **Step 4: Isi field `reportCount` di mapper**

Pada bagian mapper (baris 915-953):

Inisialisasi `branchMap` (baris ~919-929):
```typescript
branchMap.set(row.branchName, {
    branchName: row.branchName,
    reportCount: 0,   // diisi nanti ketika baris cabang (bmsName null) diproses
    bmsList: [],
    ...
});
```

Pada `if (row.bmsName === null)` (baris ~933-940), tambahkan:
```typescript
branchEntry.reportCount = Number(row.report_count);
```

Pada `else` branch (baris ~942-951), tambahkan di `bmsList.push`:
```typescript
branchEntry.bmsList.push({
  bmsName: row.bmsName,
  reportCount: Number(row.report_count),
  estimasiToAppvBMC: row.avg_est_to_appv_bmc ? Number(row.avg_est_to_appv_bmc) : null,
  ...
});
```

- [ ] **Step 5: Verifikasi TypeScript**

```powershell
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 6: Tambahkan kolom "JUMLAH LAPORAN" di `handleExport`**

Di `app/dashboard/branches/_components/admin-sla-table.tsx`, ubah `handleExport`:

```typescript
const handleExport = () => {
  const rows: Record<string, string | number>[] = [];

  data.forEach((branch) => {
    rows.push({
      "Nama Cabang": branch.branchName,
      "Nama BMS": "[RATA-RATA CABANG]",
      "JUMLAH LAPORAN": branch.reportCount,
      "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(branch.estimasiToAppvBMC),
      "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(branch.estimasiToRevisiBMC),
      "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(branch.appvBMCToWorkStart),
      "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(branch.workStartToRealisasi),
      "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(branch.realisasiToRevisiBMC),
      "REALISASI DIAJUKAN - APPV BMC": formatDuration(branch.realisasiToAppvBMC),
      "APPV BMC - APPV MGR": formatDuration(branch.appvBMCToAppvMGR),
    });

    branch.bmsList.forEach((bms) => {
      rows.push({
        "Nama Cabang": branch.branchName,
        "Nama BMS": bms.bmsName,
        "JUMLAH LAPORAN": bms.reportCount,
        "PENGAJUAN ESTIMASI - APPV ESTIMASI BMC": formatDuration(bms.estimasiToAppvBMC),
        "PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC": formatDuration(bms.estimasiToRevisiBMC),
        "APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS": formatDuration(bms.appvBMCToWorkStart),
        "PEKERJAAN DIMULAI - REALISASI DIAJUKAN": formatDuration(bms.workStartToRealisasi),
        "REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC": formatDuration(bms.realisasiToRevisiBMC),
        "REALISASI DIAJUKAN - APPV BMC": formatDuration(bms.realisasiToAppvBMC),
        "APPV BMC - APPV MGR": formatDuration(bms.appvBMCToAppvMGR),
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SLA Proses");
  XLSX.writeFile(workbook, "SLA_Proses_SPARTA.xlsx");
};
```

- [ ] **Step 7: Uji di browser**

1. Buka `/dashboard/branches?tab=sla`.
2. Klik "Ekspor XLSX".
3. Buka file: urutan kolom harus: **Nama Cabang | Nama BMS | JUMLAH LAPORAN | PENGAJUAN ESTIMASI ...**
4. Baris `[RATA-RATA CABANG]` harus menampilkan total laporan cabang.
5. Setiap baris BMS menampilkan jumlah laporan milik BMS tersebut.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/branches/actions.ts app/dashboard/branches/_components/admin-sla-table.tsx
git commit -m "feat(branches): add report count column to SLA process XLSX export"
```

---

## Task 6: Task Note

**Files:**
- Create: `docs/agent-notes/<tanggal WIB YYYY-MM-DD-HHMM>-admin-dashboard-5improvements.md`

---

- [ ] **Step 1: Buat task note**

Buat file dengan konten:

```markdown
# Admin Dashboard 5 Improvements

## Scope

- [Poin 1] Export XLSX + tooltip Total Realisasi + kecilkan margin bawah chart
- [Poin 4] Kecilkan padding-Y 5 card footer stats
- [Poin 5] Tambah kolom "Jumlah Laporan" di XLSX export SLA Proses

## Changed Files

- app/dashboard/queries.ts
- app/dashboard/_components/admin/realisasi-chart-widget.tsx
- app/dashboard/_components/admin/admin-dashboard-v2.tsx
- app/dashboard/branches/actions.ts
- app/dashboard/branches/_components/admin-sla-table.tsx

## Decisions

- Field `total` di RealisasiBranchStat dihitung hanya dari `validVals >= 1000` (konsisten dengan `avg`) untuk menghindari nilai noise dari laporan uji coba.
- `COUNT(*)` di PostgreSQL mengembalikan `bigint` sehingga perlu `Number()` cast di TypeScript.
- Hidden `<Line dataKey="total">` digunakan untuk menjaga urutan tooltip Recharts (count -> total -> avg) tanpa menampilkan garis ekstra di chart.
```

- [ ] **Step 2: Commit final**

```bash
git add docs/agent-notes/<filename>.md
git commit -m "docs: add task note for admin dashboard 5 improvements"
```
