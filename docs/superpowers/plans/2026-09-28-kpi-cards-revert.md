# Revert KPI Cards to Main Branch Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti komponen KPI Cards di dashboard admin v2 dengan komponen `KpiGrid` yang sama persis seperti di branch `main` agar sub-item bisa diklik.

**Architecture:** Kita akan menghapus file `kpi-cards.tsx` yang baru dan mengimpor ulang komponen `KpiGrid` yang sudah ada (dan diekspor) di `admin-new-dashboard.tsx` ke dalam `admin-dashboard-v2.tsx`.

**Tech Stack:** Next.js, React

## Global Constraints
- Tidak merusak fungsionalitas filter brand pada dashboard.
- Tetap menjaga konsistensi prop yang dikirim ke `KpiGrid`.

---

### Task 1: Update AdminDashboardV2 untuk menggunakan KpiGrid

**Files:**
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

**Interfaces:**
- Consumes: `KpiGrid` dari `./admin-new-dashboard`
- Produces: Rendering 3 kartu ringkasan dengan link yang bisa diklik.

- [ ] **Step 1: Hapus import AdminKpiCards dan tambahkan import KpiGrid**

```tsx
// Cari baris ini di app/dashboard/_components/admin/admin-dashboard-v2.tsx
// import { AdminKpiCards } from "./kpi-cards";
// Ganti dengan:
import { KpiGrid } from "./admin-new-dashboard";
```

- [ ] **Step 2: Ganti penggunaan komponen di dalam AdminDashboardV2**

```tsx
// Cari baris ini:
// <AdminKpiCards data={data} />
// Ganti dengan:
<KpiGrid
  kpi={data.kpi}
  pjum={data.pjum}
  breakdown={data.brandBreakdown}
  isBrandFiltered={selectedBrand !== "ALL"}
  brand={selectedBrand}
/>
```

- [ ] **Step 3: Commit perubahan**

```bash
git add app/dashboard/_components/admin/admin-dashboard-v2.tsx
git commit -m "feat: use KpiGrid from admin-new-dashboard to restore clickable sub-items"
```

---

### Task 2: Hapus file kpi-cards.tsx yang tidak digunakan

**Files:**
- Delete: `app/dashboard/_components/admin/kpi-cards.tsx`

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Hapus file kpi-cards.tsx**

```bash
rm app/dashboard/_components/admin/kpi-cards.tsx
```

- [ ] **Step 2: Commit perubahan**

```bash
git rm app/dashboard/_components/admin/kpi-cards.tsx
git commit -m "refactor: remove unused kpi-cards.tsx"
```
