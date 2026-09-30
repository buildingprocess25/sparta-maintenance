# Modular Dashboard Filters Implementation Plan (Option 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) atau superpowers:executing-plans untuk eksekusi.

**Goal:** Menerapkan arsitektur "Full Modular" pada Dashboard V2, di mana setiap seksi (Ringkasan KPI, Preventif, SLA, dan Realisasi) memiliki kendali filternya masing-masing secara independen.

**Architecture Strategy:**
1. **Header Utama (Global):** Hanya menampilkan filter `Brand`.
2. **Ringkasan Operasional (KPI & Status):** Memiliki filter `Bulan/Tahun` tersendiri, yang mengontrol URL `?period=...` (karena ini adalah _default flow_ dari SSR).
3. **Preventif & Durasi Proses:** Menggunakan UI bawaannya (dropdown Triwulan). Tidak ada perubahan kode pada komponen ini karena *rollback* sudah dilakukan.
4. **Grafik Realisasi:** Dibuat menjadi *Client Component* mandiri `RealisasiChartWidget` yang menerima `initialData`. Memiliki *dropdown* filter periode sendiri dan mengambil data via *Server Action* secara asinkron tanpa *reload* halaman.

---

### Task 1: Modifikasi Filter UI (AdminTrendPeriodFilter)

**Files:**
- Modify: `app/dashboard/_components/admin/admin-trend-filter.tsx`

- [ ] Tambahkan prop `showPeriodFilter?: boolean` (default: `true`) pada komponen `AdminTrendPeriodFilter`.
- [ ] Render bagian `Select` untuk `periodVal` dan `Input` untuk `year` HANYA jika `showPeriodFilter === true`.

---

### Task 2: Relokasi Filter ke Header "Ringkasan Operasional"

**Files:**
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

- [ ] Di dalam komponen `AdminDashboardV2`, pada prop `headerActions` di `AdminDashboardShell`, set `showPeriodFilter={false}`.
- [ ] Pada komponen `DashboardHeader`, ubah antarmuka (UI) untuk merender filter periode di sebelah judul. 
      Contoh:
      ```tsx
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
              <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-semibold tracking-tight">Ringkasan Operasional</h1>
                  <AdminTrendPeriodFilter initialPeriod={period} showBrandFilter={false} showPeriodFilter={true} />
              </div>
      ```
      (Pastikan me-_pass_ `period` ke `DashboardHeader`).

---

### Task 3: Dukungan Filter Periode di Query Realisasi

**Files:**
- Modify: `app/dashboard/queries.ts`

- [ ] Tambahkan parameter `period?: string` ke `getAdminRealisasiDetail`.
- [ ] Parsing `period` menjadi format yang dimengerti oleh fungsi kalender (gunakan pendekatan yang sudah kita fix sebelumnya: `getJakartaMonthWindow(year, month)` dan `.endExclusive`).
- [ ] Ubah filter Prisma `createdAt: { gte: startDate, ...(endDate ? { lte: endDate } : {}) }`.

---

### Task 4: Server Action untuk Widget Realisasi

**Files:**
- Create/Modify: `app/dashboard/actions.ts`

- [ ] Buat *Server Action* baru:
      ```typescript
      "use server";
      export async function fetchAdminRealisasiDetailAction(brand: string, period: string) {
          // pastikan auth check dsb jika diperlukan, atau sekadar panggil queries
          return await getAdminRealisasiDetail(brand as any, undefined, period);
      }
      ```

---

### Task 5: Buat `RealisasiChartWidget` (Client Component)

**Files:**
- Create: `app/dashboard/_components/admin/realisasi-chart-widget.tsx`
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

- [ ] Pindahkan JSX dari Card "Rata-Rata Realisasi Per Laporan" (baris ke 185 dst di `admin-dashboard-v2.tsx`) ke dalam `RealisasiChartWidget`.
- [ ] Komponen ini akan memiliki internal `useState` untuk periode (opsi: YTD, Bulan tertentu) dan merender dropdown di sebelah judul "Rata-Rata Realisasi Per Laporan".
- [ ] Ketika dropdown berubah, gunakan `startTransition` untuk memanggil `fetchAdminRealisasiDetailAction` dan perbarui _state_ datanya.
- [ ] Gantikan kode lama di `admin-dashboard-v2.tsx` dengan pemanggilan `<RealisasiChartWidget initialData={realisasiData} brand={brand} />`.

---

Semua langkah di atas memenuhi kaidah modern React/Next.js (Pemisahan batas Client/Server, penggunaan Server Action untuk fetch spesifik tanpa merender ulang seluruh komponen server, dan minimasi waterfall fetching).
