# SLA Dashboard Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan narasi penjelasan pada Dashboard Admin dan tab SLA Proses, mengubah filter widget durasi menjadi per bulan, serta memperbarui style tab di halaman Performa Cabang menjadi underline.

**Architecture:** 
- `ProcessDurationWidget` (Client Component) akan diubah statenya dari quarter menjadi period (string, default "ytd").
- `getAdminProcessDurationData` (Server Action) akan disesuaikan untuk menerima parameter `period` dan menggunakan utilitas `getActivityPeriodWindow`.
- `AdminSLATable` (Client Component) akan ditambahkan narasi khusus laporan `COMPLETED`.
- `AdminBranchesPage` (Server Component) akan diperbarui class `TabsList` dan `TabsTrigger` nya agar selaras dengan style screenshot 3.

**Tech Stack:** Next.js App Router, React, Tailwind CSS.

## Global Constraints

- Do not modify existing query calculations in `getAdminProcessDurationData`, only adjust the time window logic.

---

### Task 1: Update Server Action Time Window Logic

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: `getActivityPeriodWindow` dari `@/lib/admin-activity-period`.
- Produces: `getAdminProcessDurationData(period: string)` yang mengembalikan `Promise<ProcessDurationData>`.

- [ ] **Step 1: Write the implementation**
Update method signature dan logic window. Cari function `getAdminProcessDurationData` dan ubah menjadi seperti di bawah:

```typescript
import { getActivityPeriodWindow } from "@/lib/admin-activity-period";

// ... (pastikan import ini ada)

export async function getAdminProcessDurationData(
    period: string
): Promise<ProcessDurationData> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }

    const { start: qStart, end: qEnd } = getActivityPeriodWindow(period);

    const reportPredicates: Prisma.Sql[] = [
        Prisma.sql`r."createdAt" >= ${qStart}`
    ];
    
    if (qEnd) {
        reportPredicates.push(Prisma.sql`r."createdAt" < ${qEnd}`);
    }

    if (user.role === "ADMIN") {
        reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    const isManager = user.role !== "ADMIN";
    // ... sisa fungsi query (rows dan format) dibiarkan tidak berubah
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "feat: update getAdminProcessDurationData to use period filter"
```

### Task 2: Update ProcessDurationWidget UI

**Files:**
- Modify: `app/dashboard/_components/admin/process-duration-widget.tsx`

**Interfaces:**
- Consumes: `getAdminProcessDurationData` (updated signature).
- Produces: Widget dengan narasi tambahan dan dropdown bulan.

- [ ] **Step 1: Write the implementation**
Update state, effect, dan UI Select.

Ubah `useState` untuk `quarter`:
```tsx
import { getJakartaYear } from "@/lib/time";
// hapus import PreventiveQuarter dan getJakartaCurrentQuarter jika tidak dipakai

export function ProcessDurationWidget() {
    const [period, setPeriod] = useState<string>("ytd");
    const [data, setData] = useState<ProcessDurationData | null>(null);
    const [isPending, startTransition] = useTransition();
    const currentYear = getJakartaYear();

    useEffect(() => {
        startTransition(() => {
            getAdminProcessDurationData(period).then(setData);
        });
    }, [period]);
```

Ubah bagian header untuk menampung narasi dan merubah `<Select>`:
```tsx
    return (
        <div className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold tracking-tight">Durasi Proses per Tahapan</h3>
                    <p className="text-[11px] text-muted-foreground/80">
                        *Data dihitung berdasarkan semua status laporan (In progress, ditolak, selesai).
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                        {data?.viewMode === "BMS" 
                            ? "5 teknisi dengan rata-rata durasi tertinggi (satuan: jam dan menit)" 
                            : "5 cabang dengan rata-rata durasi tertinggi (satuan: jam dan menit)"}
                    </span>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Tahun Berjalan (YTD)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ytd">Tahun Berjalan (YTD)</SelectItem>
                            <SelectItem value={`01-${currentYear}`}>Januari {currentYear}</SelectItem>
                            <SelectItem value={`02-${currentYear}`}>Februari {currentYear}</SelectItem>
                            <SelectItem value={`03-${currentYear}`}>Maret {currentYear}</SelectItem>
                            <SelectItem value={`04-${currentYear}`}>April {currentYear}</SelectItem>
                            <SelectItem value={`05-${currentYear}`}>Mei {currentYear}</SelectItem>
                            <SelectItem value={`06-${currentYear}`}>Juni {currentYear}</SelectItem>
                            <SelectItem value={`07-${currentYear}`}>Juli {currentYear}</SelectItem>
                            <SelectItem value={`08-${currentYear}`}>Agustus {currentYear}</SelectItem>
                            <SelectItem value={`09-${currentYear}`}>September {currentYear}</SelectItem>
                            <SelectItem value={`10-${currentYear}`}>Oktober {currentYear}</SelectItem>
                            <SelectItem value={`11-${currentYear}`}>November {currentYear}</SelectItem>
                            <SelectItem value={`12-${currentYear}`}>Desember {currentYear}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/admin/process-duration-widget.tsx
git commit -m "feat: add explanatory narrative and monthly filter to process duration widget"
```

### Task 3: Update AdminDashboardPage call (if necessary)

**Files:**
- Modify: `app/dashboard/page.tsx`

Tunggu, `ProcessDurationWidget` dipanggil di dalam `AdminDashboardContent` (`app/dashboard/_components/admin/admin-dashboard-content.tsx`). Karena widget melakukan `getAdminProcessDurationData` sendiri dan menyimpan periodenya sebagai internal state, kita tidak perlu memodifikasi parent, HANYA SAJA di `app/dashboard/_components/admin/admin-dashboard-content.tsx`, `ProcessDurationWidget` mungkin menerima parameter yang tidak lagi diperlukan, atau cukup dirender tanpa props. Kita biarkan jika ia dipanggil tanpa props.

### Task 4: Update AdminSLATable Narrative

**Files:**
- Modify: `app/dashboard/branches/_components/admin-sla-table.tsx`

**Interfaces:**
- Produces: Tabel dengan teks penjelasan khusus.

- [ ] **Step 1: Write the implementation**
Pada baris awal return UI di dalam `AdminSLATable`, tambahkan narasi yang diminta.

```tsx
            <div className="border-b pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
                    <p className="mt-1 text-[11px] font-medium text-amber-600/90 dark:text-amber-500/90 bg-amber-50 dark:bg-amber-500/10 inline-block px-2 py-0.5 rounded">
                        *Hanya menghitung durasi dari laporan yang statusnya sudah selesai (COMPLETED).
                    </p>
                </div>
                <Button 
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/_components/admin-sla-table.tsx
git commit -m "feat: add narrative explaining only completed reports are calculated in SLA table"
```

### Task 5: Update AdminBranchesPage Tabs Styling

**Files:**
- Modify: `app/dashboard/branches/page.tsx`

**Interfaces:**
- Produces: Tab dengan gaya garis bawah (underline) tanpa background pill.

- [ ] **Step 1: Write the implementation**
Ubah `TabsList` dan `TabsTrigger` pada `AdminBranchesPage`.

```tsx
                <div className="px-6 pt-4 border-b">
                    <TabsList className="bg-transparent border-none h-auto w-full justify-start rounded-none p-0 flex gap-4">
                        <TabsTrigger 
                            value="ringkasan" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-2 py-2 font-medium text-sm text-muted-foreground data-[state=active]:text-foreground"
                        >
                            Ringkasan Operasional
                        </TabsTrigger>
                        <TabsTrigger 
                            value="sla" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-2 py-2 font-medium text-sm text-muted-foreground data-[state=active]:text-foreground"
                        >
                            SLA Proses
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="ringkasan" className="flex-1 overflow-y-auto p-6 mt-0">
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/page.tsx
git commit -m "style: update tabs to use underline style in branches page"
```
