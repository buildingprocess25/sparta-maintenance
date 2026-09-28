# Preventive Branch Sort Toggle & "Lihat Semua" Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan toggle sort "Terendah / Tertinggi" pada list cabang di widget Checklist Preventif, dan menjadikan link "Lihat semua" agar membuka tab Cabang di `/dashboard/preventive` dengan sort yang sinkron.

**Architecture:**
- **Backend** (`actions.ts`): Ubah `getAdminPreventiveKpiData` agar mengembalikan semua cabang di field `allBranchItems` (tidak di-slice 5), sehingga frontend yang bisa sort dan slice.
- **Widget** (`preventive-kpi-widget.tsx`): Tambah state `branchSort: "asc" | "desc"`, hitung `displayedItems` dari `allBranchItems` yang di-sort+slice 5 di frontend. Link "Lihat semua" mengarah ke `/dashboard/preventive?tab=branches&sort=asc|desc`.
- **Preventive Table** (`admin-preventive-table.tsx`): Baca URL param `sort` untuk initial state, tambah state `branchSort`, render `sortedBranchSummaries` (computed via `useMemo`) di tab "branches". Tambah toggle button di header tab.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Lucide icons

## Global Constraints

- Tidak ada perubahan skema database.
- Toggle sort hanya ada saat `branchName === "all"` (mode nasional) di widget.
- Teks button toggle: "Terendah" (asc) dan "Tertinggi" (desc).
- Sort dilakukan di frontend — tidak ada query DB tambahan hanya untuk sort.
- Tab value untuk Cabang adalah `"branches"` (sudah ada, tidak perlu membuat tab baru).
- URL param `sort` default ke `"asc"` jika tidak ada.

---

### Task 1: Ekspos semua branch items dari `getAdminPreventiveKpiData`

**Files:**
- Modify: `app/dashboard/preventive/actions.ts` (lines 128-135 untuk type, 760-835 untuk fungsi)

**Interfaces:**
- Produces: `PreventiveKpiData.allBranchItems: PreventiveKpiListItem[]` — semua cabang, sorted ascending by percentage, tanpa slice(0,5).

- [ ] **Step 1: Tambah `allBranchItems` ke type `PreventiveKpiData`**

Di `app/dashboard/preventive/actions.ts`, temukan type `PreventiveKpiData` (sekitar line 128-135):

```typescript
export type PreventiveKpiData = {
    capaianNasional: number;
    tercapai: number;
    belum: number;
    listTitle: string;
    listItems: PreventiveKpiListItem[];
    branchNames: string[];
    allBranchItems: PreventiveKpiListItem[]; // semua cabang sorted asc, tanpa slice
};
```

- [ ] **Step 2: Tambah variabel `allBranchItemsForReturn` dan isi dari data semua cabang**

Di dalam `getAdminPreventiveKpiData`, temukan baris `let listTitle = ""; let listItems: ...` (sekitar line 760-761). Tambahkan satu baris:

```typescript
    let listTitle = "";
    let listItems: PreventiveKpiListItem[] = [];
    let allBranchItemsForReturn: PreventiveKpiListItem[] = [];
```

Kemudian temukan blok `if (!branchName || branchName === "all") {` (line 763-781). Refactor agar menyimpan semua data sebelum di-slice:

```typescript
    if (!branchName || branchName === "all") {
        listTitle = "5 Cabang Preventif Terendah";
        const groupMap = new Map<string, { total: number; completed: number }>();
        for (const store of allStores) {
            const current = groupMap.get(store.branchName) || { total: 0, completed: 0 };
            current.total++;
            if (completedStores.has(store.code)) current.completed++;
            groupMap.set(store.branchName, current);
        }

        const allBranches = Array.from(groupMap.entries())
            .map(([label, data]) => ({
                label,
                completed: data.completed,
                total: data.total,
                percentage: data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100)
            }))
            .sort((a, b) => a.percentage - b.percentage);

        allBranchItemsForReturn = allBranches;
        listItems = allBranches.slice(0, 5);
    }
```

- [ ] **Step 3: Tambah `allBranchItems` ke return statement**

Temukan `return {` di akhir fungsi (sekitar line 827):

```typescript
    return {
        capaianNasional,
        tercapai: totalCompleted,
        belum: totalStoresCount - totalCompleted,
        listTitle,
        listItems,
        branchNames: Array.from(new Set(allStores.map(s => s.branchName))).sort(),
        allBranchItems: allBranchItemsForReturn,
    };
```

- [ ] **Step 4: Verifikasi TypeScript compile**

```powershell
cd d:\MAGANG-ALFA\sparta-maintenance
npx tsc --noEmit 2>&1 | Select-String "actions.ts"
```

Expected: Tidak ada output error yang menyebut `actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "feat: expose allBranchItems from getAdminPreventiveKpiData"
```

---

### Task 2: Toggle sort + "Lihat semua" di widget `PreventiveKpiWidget`

**Files:**
- Modify: `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

**Interfaces:**
- Consumes: `data.allBranchItems: PreventiveKpiListItem[]` dari Task 1
- Produces: UI dengan toggle button "Terendah / Tertinggi" + link "Lihat semua" ke `/dashboard/preventive?tab=branches&sort=asc|desc`

- [ ] **Step 1: Tambah `ArrowDownUp` ke import lucide-react**

Di baris 5:

```tsx
import { ArrowUpRight, ArrowDownUp } from "lucide-react";
```

- [ ] **Step 2: Tambah state `branchSort`**

Di dalam komponen `PreventiveKpiWidget()`, setelah `const [availableBranches, ...]`:

```tsx
    const [branchSort, setBranchSort] = useState<"asc" | "desc">("asc");
```

- [ ] **Step 3: Hitung `displayedBranchItems` dan `listTitle` dinamis**

Setelah `const pieData = ...`, tambahkan:

```tsx
    const displayedBranchItems = (() => {
        if (!data?.allBranchItems?.length) return data?.listItems ?? [];
        const items = [...data.allBranchItems].sort((a, b) =>
            branchSort === "asc"
                ? a.percentage - b.percentage
                : b.percentage - a.percentage
        );
        return items.slice(0, 5);
    })();

    const branchListTitle = branchSort === "asc"
        ? "5 Cabang Preventif Terendah"
        : "5 Cabang Preventif Tertinggi";
```

- [ ] **Step 4: Ganti header section list dan render `displayedBranchItems`**

Temukan div dengan `"flex justify-between items-center mb-4"` (sekitar line 141). Ubah seluruh blok header list section menjadi:

```tsx
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium">
                            {branchName === "all"
                                ? branchListTitle
                                : (data ? data.listTitle : "Memuat...")}
                        </div>
                        <div className="flex items-center gap-2">
                            {branchName === "all" && (
                                <button
                                    onClick={() => setBranchSort(prev => prev === "asc" ? "desc" : "asc")}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    title={branchSort === "asc" ? "Tampilkan tertinggi" : "Tampilkan terendah"}
                                >
                                    <ArrowDownUp className="h-3 w-3" />
                                    {branchSort === "asc" ? "Terendah" : "Tertinggi"}
                                </button>
                            )}
                            {branchName === "all" && (
                                <Link
                                    href={`/dashboard/preventive?tab=branches&sort=${branchSort}`}
                                    className="text-xs text-primary hover:underline flex items-center"
                                >
                                    Lihat semua <ArrowUpRight className="h-3 w-3 ml-0.5" />
                                </Link>
                            )}
                        </div>
                    </div>
```

Kemudian di map loop (sekitar line 153), ganti `data.listItems.map` menjadi `displayedBranchItems.map`:

```tsx
                        {data ? displayedBranchItems.map((item, i) => {
```

- [ ] **Step 5: Verifikasi TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "preventive-kpi-widget"
```

Expected: Tidak ada output error.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/_components/admin/preventive-kpi-widget.tsx
git commit -m "feat: add branch sort toggle and Lihat Semua link to preventive KPI widget"
```

---

### Task 3: Baca URL param `sort`, tambah toggle di tab Cabang preventive page

**Files:**
- Modify: `app/dashboard/preventive/page.tsx` (lines 14-22 searchParams type, 55-56 parsing, 85-96 props)
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx` (props interface ~line 238-250, state, TabsContent ~line 1015-1077)

**Interfaces:**
- Consumes: URL param `?sort=asc|desc`
- Produces: Tab Cabang dengan toggle sort dan `sortedBranchSummaries` ditampilkan.

- [ ] **Step 1: Tambah `sort` ke searchParams type di page.tsx**

```typescript
type Props = {
    searchParams: Promise<{
        branch?: string;
        year?: string;
        quarter?: string;
        brand?: string;
        tab?: string;
        sort?: string;
    }>;
};
```

- [ ] **Step 2: Parse `initialSort` dan pass ke AdminPreventiveTable**

Setelah `const initialTab = ...` (line 55-56), tambahkan:

```typescript
    const initialSort: "asc" | "desc" = params.sort === "desc" ? "desc" : "asc";
```

Dan di JSX `<AdminPreventiveTable ... >` tambahkan prop:

```tsx
                initialBranchSort={initialSort}
```

- [ ] **Step 3: Tambah prop `initialBranchSort` ke `AdminPreventiveTable` interface**

Ubah signature fungsi dan type object props:

```typescript
export function AdminPreventiveTable({
    ...
    initialTab,
    initialBranchSort = "asc",
}: {
    ...
    initialTab?: string;
    initialBranchSort?: "asc" | "desc";
}) {
```

- [ ] **Step 4: Tambah state `branchSort` dan `sortedBranchSummaries`**

Setelah `const [activeTab, ...] = useState(...)`:

```typescript
    const [branchSort, setBranchSort] = useState<"asc" | "desc">(initialBranchSort);
```

Setelah semua state, sebelum return (sekitar line 424-430), tambahkan:

```typescript
    const sortedBranchSummaries = useMemo(() =>
        [...branchSummaries].sort((a, b) =>
            branchSort === "asc"
                ? a.completionRate - b.completionRate
                : b.completionRate - a.completionRate
        ),
        [branchSummaries, branchSort]
    );
```

- [ ] **Step 5: Tambah `ArrowDownUp` ke import lucide-react**

Temukan blok import lucide-react (line 7-19) dan tambahkan `ArrowDownUp`:

```typescript
import {
    Activity,
    AlertCircle,
    ArrowDownUp,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    FileText,
    Loader2,
    Search,
    Store,
} from "lucide-react";
```

- [ ] **Step 6: Tambah toggle button dan ganti render di TabsContent "branches"**

Temukan `<TabsContent value="branches" className="mt-0">` (line 1016). Tambahkan header dengan toggle sebelum `<div className="overflow-hidden ...">`:

```tsx
                        <TabsContent value="branches" className="mt-0">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-muted-foreground">
                                    Ringkasan capaian checklist preventif per cabang.
                                </p>
                                <button
                                    onClick={() => setBranchSort(prev => prev === "asc" ? "desc" : "asc")}
                                    className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                                >
                                    <ArrowDownUp className="h-3.5 w-3.5" />
                                    {branchSort === "asc" ? "Terendah dulu" : "Tertinggi dulu"}
                                </button>
                            </div>
                            <div className="overflow-hidden rounded-lg border bg-background">
```

Kemudian ubah `branchSummaries.map` dan `branchSummaries.length` menjadi `sortedBranchSummaries.map` dan `sortedBranchSummaries.length` di dalam TabsContent tersebut.

- [ ] **Step 7: Verifikasi TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "admin-preventive-table|page.tsx"
```

Expected: Tidak ada output error.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/preventive/page.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx
git commit -m "feat: add branch sort toggle to preventive page Cabang tab with URL sync"
```

---

### Task 4: Agent Note

**Files:**
- Create: `docs/agent-notes/2026-09-28-<HHMM>-preventive-branch-sort.md`

- [ ] **Step 1: Buat agent note** (ganti `<HHMM>` dengan waktu Jakarta saat ini)

```markdown
# Preventive Branch Sort Toggle & Lihat Semua Tab

## Scope
Menambahkan toggle sort "Terendah / Tertinggi" pada list cabang di widget Checklist Preventif,
dan link "Lihat semua" yang membuka tab Cabang di halaman preventive dengan sort yang sinkron via URL param.

## Changed Files
- `app/dashboard/preventive/actions.ts`: Tambah field `allBranchItems` ke type dan return `getAdminPreventiveKpiData`.
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Tambah state `branchSort`, computed `displayedBranchItems`, toggle button, link "Lihat semua".
- `app/dashboard/preventive/page.tsx`: Baca URL param `sort`, pass `initialBranchSort` ke `AdminPreventiveTable`.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Tambah prop `initialBranchSort`, state `branchSort`, `sortedBranchSummaries`, toggle button di tab Cabang.

## Decisions
Sort dilakukan di frontend (tidak di query DB) karena jumlah cabang kecil (< 50) dan data sudah ada di memori.
URL param `sort` digunakan agar state sort dari widget bisa diteruskan ke halaman preventive saat "Lihat semua" diklik.
```

- [ ] **Step 2: Commit agent note**

```bash
git add docs/agent-notes/
git commit -m "docs: agent note for preventive branch sort feature"
```
