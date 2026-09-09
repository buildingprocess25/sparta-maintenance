# Filter Persistence via URL Query Params — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat filter di halaman-halaman dashboard (Reports, PJUM, Preventive, Stores) tidak hilang saat user berpindah ke detail page dan menekan tombol Back, dengan cara menyimpan state filter di URL query params menggunakan `useRouter` dan `useSearchParams` bawaan Next.js.

**Architecture:** Setiap kali user mengubah filter di client component, kita push/replace URL dengan query params yang merepresentasikan state filter tersebut. Saat user kembali (Back), browser restore URL sebelumnya, server component membaca `searchParams` dan meneruskannya sebagai `initialFilters` ke client component, sehingga client component terhidrasi dengan filter yang benar dari awal. Halaman Reports dan PJUM sudah punya `searchParams` di `page.tsx` — kita tinggal menghubungkan sisi client. Halaman Preventive dan Stores perlu ditambahkan `searchParams` di `page.tsx`.

**Tech Stack:** Next.js 16 App Router, `useRouter` + `useSearchParams` (built-in Next.js), TypeScript, tidak ada library tambahan.

## Global Constraints

- Gunakan `useRouter` dan `useSearchParams` dari `next/navigation` — jangan install `nuqs` atau library lain.
- Gunakan `router.replace` (bukan `router.push`) agar perubahan filter tidak menumpuk di browser history; hanya navigasi ke detail page yang masuk history (itu sudah ditangani oleh `<Link>`).
- URL params harus di-debounce 300ms untuk input teks (`search`) agar tidak terlalu agresif.
- Jangan ubah logika `loadData` (fetch ke server action) — cukup hubungkan agar terpanggil dari nilai filter yang sudah ada.
- Jangan ubah komponen `Filters` di `components/reui/filters.tsx`.
- Setiap task wajib diakhiri dengan commit.
- Setelah selesai semua task, buat task note sesuai format `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md`.

---

## Task 1: Reports — Sinkronisasi Filter Client ke URL

**Scope:** Halaman `/dashboard/reports` sudah menerima `searchParams` di `page.tsx` dan meneruskannya sebagai `initialStatus`, `initialScope`, `initialPjumStatus`, `initialBranchName`, `initialAreaName`, `initialBrand` ke `AdminReportsTable`. Yang perlu dilakukan: setiap kali state filter berubah di client, push state tersebut ke URL.

**Files:**
- Modify: `app/dashboard/reports/_components/admin-reports-table.tsx`

**Interfaces:**
- Konsumes: `useRouter`, `useSearchParams` dari `next/navigation`
- Menghasilkan: URL params `scope`, `status`, `pjumStatus`, `branchName`, `areaName`, `brand` yang terbaca oleh `page.tsx` saat navigasi kembali

---

- [ ] **Step 1: Import `useRouter` dan `useSearchParams`**

Di `admin-reports-table.tsx`, tambahkan import di baris paling atas (setelah `"use client";`):

```tsx
import { useRouter, useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Inisialisasi router di dalam komponen `AdminReportsTable`**

Tambahkan baris ini di dalam body komponen `AdminReportsTable`, tepat setelah deklarasi `initialQuickFilter` (sekitar baris 200):

```tsx
const router = useRouter();
const searchParams = useSearchParams();
```

- [ ] **Step 3: Buat helper `pushFilterToUrl` dengan debounce**

Tambahkan helper function dan ref debounce di dalam komponen `AdminReportsTable`, tepat sebelum `const observerTarget = useRef`:

```tsx
const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);

const pushFilterToUrl = useCallback(
    (overrides: {
        quickFilter?: QuickFilterKey;
        activeFilters?: Filter<string>[];
        search?: string;
    }) => {
        const resolvedQuick =
            overrides.quickFilter !== undefined
                ? overrides.quickFilter
                : quickFilter;
        const resolvedFilters =
            overrides.activeFilters !== undefined
                ? overrides.activeFilters
                : activeFilters;
        const resolvedSearch =
            overrides.search !== undefined ? overrides.search : search;

        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            // scope / status
            if (resolvedQuick === "all") {
                params.delete("scope");
                params.delete("status");
                params.delete("pjumStatus");
            } else if (resolvedQuick === "completed") {
                params.delete("scope");
                params.set("status", "COMPLETED");
                params.delete("pjumStatus");
            } else if (resolvedQuick === "not_pjum") {
                params.delete("scope");
                params.set("status", "COMPLETED");
                params.set("pjumStatus", "not_exported");
            } else {
                params.set("scope", resolvedQuick);
                params.delete("status");
                params.delete("pjumStatus");
            }

            // active filters (branchName, areaName, status override, pjumStatus override, brand)
            const getVal = (field: string) =>
                resolvedFilters.find((f) => f.field === field)?.values[0] ?? "";

            const branch = String(getVal("branchName"));
            const area = String(getVal("areaName"));
            const statusFilter = String(getVal("status"));
            const pjumFilter = String(getVal("pjumStatus"));
            const brandFilter = String(getVal("brand"));

            branch ? params.set("branchName", branch) : params.delete("branchName");
            area ? params.set("areaName", area) : params.delete("areaName");
            // Only write status/pjumStatus from filters if quickFilter is "all"
            if (resolvedQuick === "all") {
                statusFilter ? params.set("status", statusFilter) : params.delete("status");
                pjumFilter ? params.set("pjumStatus", pjumFilter) : params.delete("pjumStatus");
            }
            brandFilter && brandFilter !== "ALL"
                ? params.set("brand", brandFilter)
                : params.delete("brand");

            router.replace(`/dashboard/reports?${params.toString()}`, {
                scroll: false,
            });
        }, 300);
    },
    [quickFilter, activeFilters, search, searchParams, router],
);
```

- [ ] **Step 4: Hubungkan `pushFilterToUrl` ke `applyQuickFilter`**

Ubah fungsi `applyQuickFilter` (sekitar baris 412-421) menjadi:

```tsx
const applyQuickFilter = useCallback(
    (key: QuickFilterKey) => {
        setQuickFilter(key);
        setSearch("");
        setActiveFilters((current) => {
            const next = current.filter(
                (filter) =>
                    filter.field !== "status" && filter.field !== "pjumStatus",
            );
            pushFilterToUrl({ quickFilter: key, activeFilters: next, search: "" });
            return next;
        });
    },
    [pushFilterToUrl],
);
```

- [ ] **Step 5: Hubungkan `pushFilterToUrl` ke `resetFilters`**

Ubah fungsi `resetFilters` (sekitar baris 406-410) menjadi:

```tsx
const resetFilters = useCallback(() => {
    setSearch("");
    setQuickFilter("all");
    setActiveFilters([]);
    pushFilterToUrl({ quickFilter: "all", activeFilters: [], search: "" });
}, [pushFilterToUrl]);
```

- [ ] **Step 6: Hubungkan `pushFilterToUrl` ke perubahan `activeFilters` dari komponen `Filters`**

Cari handler `onChange` untuk `<Filters>` di JSX (di dalam komponen). Handler ini memanggil `setActiveFilters`. Ubah menjadi memanggil juga `pushFilterToUrl`:

```tsx
// Di JSX, temukan: onChange={setActiveFilters}
// Ubah menjadi:
onChange={(newFilters) => {
    setActiveFilters(newFilters);
    pushFilterToUrl({ activeFilters: newFilters });
}}
```

- [ ] **Step 7: Hubungkan `pushFilterToUrl` ke perubahan `search`**

Cari handler `onChange` untuk `<Input>` pencarian (yang memanggil `setSearch`). Ubah menjadi:

```tsx
// Temukan handler onChange pada Input search, ubah menjadi:
onChange={(e) => {
    const val = e.target.value;
    setSearch(val);
    pushFilterToUrl({ search: val });
}}
```

- [ ] **Step 8: Verifikasi manual**

Jalankan dev server:

```powershell
npm run dev
```

Lakukan langkah berikut:
1. Buka `/dashboard/reports`.
2. Pilih quick filter "Selesai" — URL harus berubah menjadi `/dashboard/reports?status=COMPLETED`.
3. Klik salah satu laporan untuk masuk ke halaman detail.
4. Tekan tombol Back di browser.
5. Pastikan filter "Selesai" masih aktif dan data tetap terfilter.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/reports/_components/admin-reports-table.tsx
git commit -m "feat(reports): persist filter state in URL query params"
```

---

## Task 2: PJUM — Sinkronisasi Filter Client ke URL

**Scope:** Halaman `/dashboard/pjum` sudah menerima `searchParams` (`status`, `branchName`, `areaName`) di `page.tsx`. Yang perlu dilakukan: sinkronisasi state filter client ke URL seperti pola di Task 1.

**Files:**
- Modify: `app/dashboard/pjum/_components/admin-pjum-table.tsx`
- Modify: `app/dashboard/pjum/page.tsx`

**Interfaces:**
- Konsumes: `useRouter`, `useSearchParams` dari `next/navigation`
- Menghasilkan: URL params `status`, `branchName`, `areaName`, `fromDate`, `toDate`

---

- [ ] **Step 1: Import `useRouter` dan `useSearchParams`**

Di `admin-pjum-table.tsx`, tambahkan import:

```tsx
import { useRouter, useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Inisialisasi router di dalam komponen `AdminPjumTable`**

Tambahkan di dalam body komponen, tepat setelah deklarasi state awal:

```tsx
const router = useRouter();
const searchParams = useSearchParams();
```

- [ ] **Step 3: Buat helper `pushFilterToUrl` dengan debounce**

Tambahkan sebelum `const observerTarget = useRef`:

```tsx
const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);

const pushFilterToUrl = useCallback(
    (overrides: {
        quickFilter?: QuickFilterKey;
        activeFilters?: Filter<string>[];
        search?: string;
    }) => {
        const resolvedQuick =
            overrides.quickFilter !== undefined ? overrides.quickFilter : quickFilter;
        const resolvedFilters =
            overrides.activeFilters !== undefined ? overrides.activeFilters : activeFilters;

        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            // status from quick filter
            if (resolvedQuick === "review_bnm") {
                params.set("status", "PENDING_APPROVAL");
            } else if (resolvedQuick === "approved") {
                params.set("status", "APPROVED");
            } else {
                params.delete("status");
            }

            const getVal = (field: string) =>
                resolvedFilters.find((f) => f.field === field)?.values[0] ?? "";

            const branch = String(getVal("branchName"));
            const area = String(getVal("areaName"));
            const from = String(getVal("fromDate"));
            const to = String(getVal("toDate"));

            branch ? params.set("branchName", branch) : params.delete("branchName");
            area ? params.set("areaName", area) : params.delete("areaName");
            from ? params.set("fromDate", from) : params.delete("fromDate");
            to ? params.set("toDate", to) : params.delete("toDate");

            router.replace(`/dashboard/pjum?${params.toString()}`, {
                scroll: false,
            });
        }, 300);
    },
    [quickFilter, activeFilters, searchParams, router],
);
```

- [ ] **Step 4: Hubungkan `pushFilterToUrl` ke semua aksi filter**

Ubah `applyQuickFilter`:

```tsx
const applyQuickFilter = useCallback(
    (key: QuickFilterKey) => {
        setQuickFilter(key);
        setSearch("");
        setActiveFilters((current) => {
            const next = current.filter((filter) => filter.field !== "status");
            pushFilterToUrl({ quickFilter: key, activeFilters: next });
            return next;
        });
    },
    [pushFilterToUrl],
);
```

Ubah `resetFilters`:

```tsx
const resetFilters = useCallback(() => {
    setSearch("");
    setQuickFilter("all");
    setActiveFilters([]);
    pushFilterToUrl({ quickFilter: "all", activeFilters: [] });
}, [pushFilterToUrl]);
```

- [ ] **Step 5: Hubungkan ke `onChange` Filters dan Input search**

Cari `onChange` pada `<Filters>` dan `<Input>` pencarian, ubah serupa dengan Task 1 Step 6 & 7:

```tsx
// <Filters> onChange:
onChange={(newFilters) => {
    setActiveFilters(newFilters);
    pushFilterToUrl({ activeFilters: newFilters });
}}

// <Input> search onChange:
onChange={(e) => {
    const val = e.target.value;
    setSearch(val);
    // search tidak perlu push ke URL (tidak ada SSR filter untuk search di pjum/page.tsx)
}}
```

- [ ] **Step 6: Tambahkan `fromDate` dan `toDate` di `page.tsx`**

Di `app/dashboard/pjum/page.tsx`, update type dan pembacaan params:

```tsx
// Update type:
type AdminPjumPageProps = {
    searchParams?: Promise<{
        status?: string;
        branchName?: string;
        areaName?: string;
        fromDate?: string;
        toDate?: string;
    }>;
};

// Di dalam fungsi AdminPjumPage, setelah initialAreaName:
const initialFromDate = params?.fromDate?.trim() || undefined;
const initialToDate = params?.toDate?.trim() || undefined;
const initialFilters = {
    ...(initialStatus ? { status: initialStatus } : {}),
    ...(initialBranchName ? { branchName: initialBranchName } : {}),
    ...(initialAreaName ? { areaName: initialAreaName } : {}),
    ...(initialFromDate ? { fromDate: initialFromDate } : {}),
    ...(initialToDate ? { toDate: initialToDate } : {}),
};
```

- [ ] **Step 7: Verifikasi manual**

```powershell
npm run dev
```

1. Buka `/dashboard/pjum`.
2. Klik quick filter "Review BNM" — URL harus menjadi `/dashboard/pjum?status=PENDING_APPROVAL`.
3. Klik salah satu PJUM — masuk ke `/dashboard/pjum/[id]`.
4. Tekan Back.
5. Filter "Review BNM" harus masih aktif.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/pjum/_components/admin-pjum-table.tsx app/dashboard/pjum/page.tsx
git commit -m "feat(pjum): persist filter state in URL query params"
```

---

## Task 3: Preventive — Tambah `searchParams` ke `page.tsx` dan sinkronisasi

**Scope:** Halaman `/dashboard/preventive` saat ini tidak membaca `searchParams` sama sekali di `page.tsx`. Filter (`branchName`, `year`, `quarter`, `brand`, `activeTab`) sepenuhnya lokal di `AdminPreventiveTable`. Kita tambahkan `searchParams` ke `page.tsx` dan sinkronisasi state ke URL.

**Files:**
- Modify: `app/dashboard/preventive/page.tsx`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`

**Interfaces:**
- `page.tsx` meneruskan `initialBranch`, `initialYear`, `initialQuarter`, `initialBrand`, `initialTab` ke `AdminPreventiveTable`
- `AdminPreventiveTable` menerima props baru tersebut

---

- [ ] **Step 1: Update `page.tsx` untuk membaca `searchParams`**

Ganti seluruh isi `app/dashboard/preventive/page.tsx` dengan:

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { getAdminPreventive, getPreventiveBranchOptions, getReportYears } from "./actions";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
import { ExportPreventiveDialog } from "./_components/export-preventive-dialog";
import { getJakartaYear } from "@/lib/time";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import type { PreventiveQuarter } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        branch?: string;
        year?: string;
        quarter?: string;
        brand?: string;
        tab?: string;
    }>;
};

const VALID_QUARTERS = new Set(["1", "2", "3", "4"]);
const VALID_TABS = new Set(["quarter", "history"]);

function normalizeQuarter(value?: string): PreventiveQuarter | undefined {
    if (value && VALID_QUARTERS.has(value)) {
        return Number(value) as PreventiveQuarter;
    }
    return undefined;
}

export default async function AdminPreventivePage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    const isAdmin = user.role === "ADMIN";
    const currentYear = getJakartaYear();
    const params = await searchParams;

    const initialBranch = params.branch?.trim() || "all";
    const rawYear = Number(params.year);
    const initialYear =
        rawYear >= 2020 && rawYear <= currentYear + 1 ? rawYear : currentYear;
    const initialQuarter = normalizeQuarter(params.quarter);
    const initialBrand = isAdmin ? normalizeStoreBrandFilter(params.brand) : "ALL";
    const initialTab =
        params.tab && VALID_TABS.has(params.tab) ? params.tab : "quarter";

    const [branchOptions, years, initialData] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve([]),
        getReportYears(),
        getAdminPreventive(null, 20, {
            year: initialYear,
            branchName: initialBranch,
            completion: "completed",
            ...(initialQuarter ? { quarter: initialQuarter } : {}),
        }),
    ]);
    const branches = isAdmin ? branchOptions : user.branchNames;

    return (
        <AdminDashboardShell
            user={user}
            title="Checklist Preventif"
            breadcrumbs={[{ label: "Checklist Preventif" }]}
            headerActions={
                <ExportPreventiveDialog
                    branches={branches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full gap-0 p-0 lg:p-0"
        >
            <AdminPreventiveTable
                initialData={initialData}
                branches={branches}
                availableYears={years}
                defaultBranch={initialBranch}
                showBranchControls={isAdmin}
                showBrandFilter={isAdmin}
                initialYear={initialYear}
                initialQuarter={initialQuarter}
                initialBrand={initialBrand}
                initialTab={initialTab}
            />
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 2: Update props `AdminPreventiveTable` untuk terima initial values**

Di `app/dashboard/preventive/_components/admin-preventive-table.tsx`, update interface props dan inisialisasi state:

```tsx
// Tambahkan ke interface props fungsi AdminPreventiveTable:
    initialYear?: number;
    initialQuarter?: PreventiveQuarter;
    initialBrand?: StoreBrandFilter;
    initialTab?: string;

// Ubah inisialisasi state di dalam komponen:
    const [activeTab, setActiveTab] = useState(initialTab ?? "quarter");
    const [branchName, setBranchName] = useState<string>(defaultBranch);
    const [brand, setBrand] = useState<StoreBrandFilter>(initialBrandProp ?? "ALL");
    const [year, setYear] = useState<number>(
        initialYear ?? initialData.summary.year ?? currentYear,
    );
    const [quarter, setQuarter] = useState<PreventiveQuarter>(
        initialQuarter ?? initialData.summary.quarter ?? getCurrentQuarter(),
    );
```

Catatan: Rename prop `initialBrand` di destructuring menjadi `initialBrandProp` untuk menghindari name clash dengan state `brand`.

- [ ] **Step 3: Tambah `pushFilterToUrl` ke `AdminPreventiveTable`**

Import router dan tambahkan helper:

```tsx
import { useRouter, useSearchParams } from "next/navigation";

// Di dalam komponen, setelah useState declarations:
const router = useRouter();
const searchParams = useSearchParams();
const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);

const pushFilterToUrl = useCallback(
    (overrides: {
        branchName?: string;
        year?: number;
        quarter?: PreventiveQuarter;
        brand?: StoreBrandFilter;
        activeTab?: string;
    }) => {
        const resolvedBranch = overrides.branchName ?? branchName;
        const resolvedYear = overrides.year ?? year;
        const resolvedQuarter = overrides.quarter ?? quarter;
        const resolvedBrand = overrides.brand ?? brand;
        const resolvedTab = overrides.activeTab ?? activeTab;

        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            resolvedBranch && resolvedBranch !== "all"
                ? params.set("branch", resolvedBranch)
                : params.delete("branch");
            params.set("year", String(resolvedYear));
            params.set("quarter", String(resolvedQuarter));
            resolvedBrand && resolvedBrand !== "ALL"
                ? params.set("brand", resolvedBrand)
                : params.delete("brand");
            resolvedTab !== "quarter"
                ? params.set("tab", resolvedTab)
                : params.delete("tab");

            router.replace(`/dashboard/preventive?${params.toString()}`, {
                scroll: false,
            });
        }, 300);
    },
    [branchName, year, quarter, brand, activeTab, searchParams, router],
);
```

- [ ] **Step 4: Hubungkan `pushFilterToUrl` ke setiap setter filter**

Cari semua tempat di JSX/handlers yang memanggil `setBranchName`, `setYear`, `setQuarter`, `setBrand`, `setActiveTab`. Tambahkan `pushFilterToUrl` setelah setiap setter:

```tsx
// setBranchName:
setBranchName(val);
pushFilterToUrl({ branchName: val });

// setYear:
setYear(newYear);
pushFilterToUrl({ year: newYear });

// setQuarter:
setQuarter(newQuarter);
pushFilterToUrl({ quarter: newQuarter });

// setBrand:
setBrand(newBrand);
pushFilterToUrl({ brand: newBrand });

// setActiveTab (via <Tabs> onValueChange):
setActiveTab(newTab);
pushFilterToUrl({ activeTab: newTab });
```

- [ ] **Step 5: Verifikasi manual**

```powershell
npm run dev
```

1. Buka `/dashboard/preventive`.
2. Ganti Branch menjadi salah satu cabang (jika ADMIN) — URL harus berubah ke `?branch=<nama>&year=...&quarter=...`.
3. Klik link laporan preventive (masuk ke `/dashboard/reports/[reportNumber]`).
4. Tekan Back.
5. Filter Branch harus masih terpilih.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/preventive/page.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx
git commit -m "feat(preventive): persist filter state in URL query params"
```

---

## Task 4: Stores — Tambah `searchParams` ke `page.tsx` dan sinkronisasi

**Scope:** Halaman `/dashboard/stores` tidak membaca `searchParams`. Filter (`search`, `branchName`, `areaName`) lokal di `AdminStoresTable`. Kita tambahkan `searchParams` ke `page.tsx`.

**Files:**
- Modify: `app/dashboard/stores/page.tsx`
- Modify: `app/dashboard/stores/_components/admin-stores-table.tsx`

**Interfaces:**
- `page.tsx` baru membaca `searchParams` dan meneruskan `initialSearch`, `initialBranchName`, `initialAreaName` ke `AdminStoresTable`
- `AdminStoresTable` menerima props baru tersebut

---

- [ ] **Step 1: Update `page.tsx` untuk membaca `searchParams`**

Ganti seluruh isi `app/dashboard/stores/page.tsx` dengan:

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminStoresTable } from "./_components/admin-stores-table";
import { ExportStoresDialog } from "./_components/export-stores-dialog";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAllBrands } from "@/app/admin/database/queries";
import { getStoreAreaNamesByBranches } from "@/app/bmc/database/queries";
import { getAdminStores } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        search?: string;
        branch?: string;
        area?: string;
    }>;
};

export default async function AdminStoresPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN" && user.role !== "BMC") redirect("/dashboard");

    const params = await searchParams;
    const initialSearch = params.search?.trim() || "";
    const initialBranchName = params.branch?.trim() || "all";
    const initialAreaName = params.area?.trim() || "all";

    const [branches, allBrands] = await Promise.all([
        user.role === "ADMIN"
            ? fetchAllBranchNames()
            : Promise.resolve(
                  user.branchNames
                      .map((branchName) => branchName.trim())
                      .filter((branchName) => branchName.length > 0),
              ),
        getAllBrands(),
    ]);

    const areaNamesByBranch = await getStoreAreaNamesByBranches(branches);

    const initialData = await getAdminStores(null, 20, {
        search: initialSearch || undefined,
        branchName: initialBranchName !== "all" ? initialBranchName : undefined,
        areaName: initialAreaName !== "all" ? initialAreaName : undefined,
    });

    return (
        <AdminDashboardShell
            user={user}
            title="Management Toko"
            breadcrumbs={[{ label: "Toko" }]}
            headerActions={<ExportStoresDialog branches={branches} />}
            contentClassName="h-full"
        >
            <AdminStoresTable
                initialData={initialData.stores}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                branches={branches}
                areaNames={user.areaNames}
                allBrands={allBrands}
                areaNamesByBranch={areaNamesByBranch}
                canManage
                initialSearch={initialSearch}
                initialBranchName={initialBranchName}
                initialAreaName={initialAreaName}
            />
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 2: Update props dan state `AdminStoresTable`**

Di `app/dashboard/stores/_components/admin-stores-table.tsx`, tambahkan props baru ke interface komponen:

```tsx
// Tambahkan ke interface props (props yang sudah ada):
    initialSearch?: string;
    initialBranchName?: string;
    initialAreaName?: string;

// Ubah deklarasi state filter dari:
    const [search, setSearch] = useState("");
    const [branchName, setBranchName] = useState("all");
    const [areaName, setAreaName] = useState("all");
// Menjadi:
    const [search, setSearch] = useState(initialSearch ?? "");
    const [branchName, setBranchName] = useState(initialBranchName ?? "all");
    const [areaName, setAreaName] = useState(initialAreaName ?? "all");
```

- [ ] **Step 3: Tambahkan `pushFilterToUrl` ke `AdminStoresTable`**

Import router dan tambahkan helper:

```tsx
import { useRouter, useSearchParams } from "next/navigation";

// Di dalam komponen, tambahkan:
const router = useRouter();
const searchParams = useSearchParams();
const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);

const pushFilterToUrl = useCallback(
    (overrides: {
        search?: string;
        branchName?: string;
        areaName?: string;
    }) => {
        const resolvedSearch = overrides.search ?? search;
        const resolvedBranch = overrides.branchName ?? branchName;
        const resolvedArea = overrides.areaName ?? areaName;

        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            resolvedSearch
                ? params.set("search", resolvedSearch)
                : params.delete("search");
            resolvedBranch && resolvedBranch !== "all"
                ? params.set("branch", resolvedBranch)
                : params.delete("branch");
            resolvedArea && resolvedArea !== "all"
                ? params.set("area", resolvedArea)
                : params.delete("area");

            router.replace(`/dashboard/stores?${params.toString()}`, {
                scroll: false,
            });
        }, 300);
    },
    [search, branchName, areaName, searchParams, router],
);
```

- [ ] **Step 4: Hubungkan `pushFilterToUrl` ke setiap setter filter**

Cari semua handler yang memanggil `setSearch`, `setBranchName`, `setAreaName` di JSX. Tambahkan `pushFilterToUrl` setelah setter:

```tsx
// setSearch (onChange pada Input):
onChange={(e) => {
    const val = e.target.value;
    setSearch(val);
    pushFilterToUrl({ search: val });
}}

// setBranchName:
setBranchName(val);
pushFilterToUrl({ branchName: val });

// setAreaName:
setAreaName(val);
pushFilterToUrl({ areaName: val });
```

Jika ada tombol Reset filter:

```tsx
setSearch("");
setBranchName("all");
setAreaName("all");
pushFilterToUrl({ search: "", branchName: "all", areaName: "all" });
```

- [ ] **Step 5: Verifikasi manual**

```powershell
npm run dev
```

1. Buka `/dashboard/stores`.
2. Ketik kata kunci di search — URL harus berubah ke `?search=<keyword>`.
3. Pilih Branch — URL bertambah `?search=<keyword>&branch=<name>`.
4. Refresh halaman — filter harus tetap aktif (data sudah difilter dari SSR).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/stores/page.tsx app/dashboard/stores/_components/admin-stores-table.tsx
git commit -m "feat(stores): persist filter state in URL query params"
```

---

## Task 5: Verifikasi Akhir dan Task Note

- [ ] **Step 1: Build TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: Tidak ada TypeScript error.

- [ ] **Step 2: Lint check**

```powershell
npm run lint
```

Expected: Tidak ada lint error baru.

- [ ] **Step 3: Smoke test manual semua halaman**

Jalankan `npm run dev` dan verifikasi setiap halaman:

| Halaman | Aksi | Ekspektasi URL | Ekspektasi Back |
|---|---|---|---|
| `/dashboard/reports` | Pilih quick filter "Selesai" | `?status=COMPLETED` | Filter tetap aktif |
| `/dashboard/reports` | Pilih Branch + quick filter | `?scope=...&branchName=...` | Filter tetap aktif |
| `/dashboard/pjum` | Pilih quick filter "Review BNM" | `?status=PENDING_APPROVAL` | Filter tetap aktif |
| `/dashboard/pjum` | Pilih Branch | `?status=...&branchName=...` | Filter tetap aktif |
| `/dashboard/preventive` | Ganti Branch & Quarter | `?branch=...&year=...&quarter=...` | Filter tetap aktif |
| `/dashboard/stores` | Ketik search | `?search=...` | Filter tetap aktif |
| `/dashboard/stores` | Pilih Branch | `?branch=...` | Filter tetap aktif |

- [ ] **Step 4: Buat task note**

Buat file `docs/agent-notes/<YYYY-MM-DD-HHMM>-filter-persistence-url.md` (gunakan waktu Asia/Jakarta saat ini) dengan mengikuti template di `docs/agent-notes/TEMPLATE.md`.

Isi ringkas:
- **Task:** Persistent filter via URL query params
- **Files changed:** `admin-reports-table.tsx`, `admin-pjum-table.tsx`, `admin-preventive-table.tsx`, `admin-stores-table.tsx`, `preventive/page.tsx`, `stores/page.tsx`, `pjum/page.tsx`
- **Approach:** `useRouter.replace()` + `useSearchParams()` bawaan Next.js, debounce 300ms, `scroll: false`
- **Out of scope:** `AdminUsersTable` (tidak ada detail page navigation), `AdminBranchesTable` (filter di-handle via server component dengan cara yang berbeda)

- [ ] **Step 5: Final commit**

```bash
git add docs/agent-notes/
git commit -m "docs: add agent note for filter persistence feature"
```

---

## Catatan Penting untuk Pelaksana

1. **`router.replace` bukan `router.push`** — Ini krusial. Kita hanya ingin memperbarui URL tanpa menambah entry di browser history. Yang harus masuk history hanyalah navigasi ke detail page (itu sudah ditangani oleh `<Link>`).
2. **Debounce 300ms** — Wajib untuk input teks (`search`) agar tidak terlalu banyak replace saat user mengetik.
3. **`scroll: false`** — Sertakan `{ scroll: false }` pada `router.replace` agar halaman tidak scroll ke atas saat filter berubah.
4. **`AdminBranchesTable` dan `AdminUsersTable` TIDAK masuk scope** — Branches sudah menggunakan URL params dengan cara berbeda (server-rendered filter). Users tidak memiliki detail page navigation sehingga masalah ini tidak dialami oleh user.
5. **Preventive page** — `page.tsx` sebelumnya tidak menerima `searchParams` sama sekali. Task 3 menambahkannya. Pastikan initial data di-fetch dengan filter yang benar dari server.
