# Design Document: BMS Store Coverage Binding & Preventive KPI Monitoring

- **Date:** 2026-10-07
- **Status:** Approved
- **Scope:** Data Model, Form Guards, Store Management Integration, and Multi-Role KPI Monitoring

---

## 1. Problem Statement & Background

Di arsitektur SPARTA Maintenance saat ini:
1. Model `Store` hanya berelasi dengan `branchName` dan `areaName`.
2. Model `User` (BMS) hanya berelasi dengan `branchNames: String[]`.
3. **Celah Operasional:** Saat BMS membuat laporan di `/reports/(bms)/create`, sistem memanggil `getStoresByBranch`, sehingga seluruh toko se-cabang (ratusan toko) dapat dipilih oleh BMS manapun di cabang tersebut. Hal ini membuka celah di mana seorang BMS dapat secara sengaja maupun tidak membuat laporan maintenance ke toko yang bukan menjadi tanggung jawab coverage binaannya.
4. **Ketiadaan Monitoring KPI BMS:** Di dashboard BMC, BNM, dan Admin belum terdapat pemantauan KPI individual BMS (misal: BMS A memiliki target coverage 50 toko spesifik, per kuartal berjalan sudah menyelesaikan berapa persen dan toko mana saja yang belum dikunjungi).

Berdasarkan master data file `TOKO BMS AGUSTUS 2026.xlsx` (21.891 baris toko, 28 cabang, 418 BMS):
- Rata-rata 1 BMS mengcover ~51 toko (min 1, max 113).
- 21.873 dari 21.891 toko (99.9%) sudah terdaftar di database.
- 404 dari 418 BMS (96.6%) sudah terdaftar di database.

---

## 2. Architecture & Data Model

### 2.1. Model `BmsStoreAssignment` (`prisma/schema.prisma`)

Untuk mendukung relasi Many-to-Many terkelola, mutasi/rotasi toko, serta riwayat penugasan (audit trail):

```prisma
model BmsStoreAssignment {
  id              String    @id @default(uuid())
  bmsNIK          String
  storeCode       String
  isActive        Boolean   @default(true)
  assignedAt      DateTime  @default(now()) @db.Timestamptz(3)
  assignedByNIK   String?
  unassignedAt    DateTime? @db.Timestamptz(3)
  unassignedByNIK String?
  notes           String?

  bms             User      @relation("BmsAssignments", fields: [bmsNIK], references: [NIK])
  store           Store     @relation("StoreAssignments", fields: [storeCode], references: [code])

  @@index([storeCode, isActive])
  @@index([bmsNIK, isActive])
  @@index([bmsNIK, storeCode])
}
```

### 2.2. Database-level Partial Unique Index

Untuk memastikan 1 toko hanya memiliki maksimal 1 penanggung jawab BMS aktif pada satu waktu:
```sql
CREATE UNIQUE INDEX unique_active_store_assignment 
ON "BmsStoreAssignment" ("storeCode") 
WHERE "isActive" = true;
```

---

## 3. Data Migration & Master Import

### 3.1. Skrip Import CLI (`scripts/import-bms-store-assignments.ts`)
- Membaca sheet `GABUNG CABANG` dari `"C:\Users\Rendi Elang\Downloads\TOKO BMS AGUSTUS 2026.xlsx"`.
- Normalisasi NIK: string 8 digit (`String(nik).padStart(8, '0')`).
- Integritas data:
  - Lewati (skip) toko dengan NIK `VACANT` atau BMS yang belum terdaftar di database `User`, catat ke `logs/skipped-bms-assignments.json`.
  - Lewati toko yang belum terdaftar di database `Store`.
- Eksekusi batch upsert dengan transaksi per 500 baris.

---

## 4. Form Protections & Validation Guard

### 4.1. Input Form BMS (`/reports/(bms)/create`)
- Ganti `getStoresByBranch` dengan `getAssignedStoresForBms(user.NIK)`:
  Hanya mengembalikan toko-toko dengan `isActive: true` di mana `bmsNIK = user.NIK`.
- Dropdown toko BMS hanya memuat toko binaan dirinya sendiri.

### 4.2. Backend Guard (`submitReport` & `resubmitReport`)
- Pasang validasi transaksi:
  Memeriksa apakah `storeCode` terdaftar aktif di `BmsStoreAssignment` untuk `bmsNIK: user.NIK`.
- Jika bukan toko coverage, lempar error: `"Toko di luar wilayah coverage Anda"`.

---

## 5. Store Management & Mutation Flow

### 5.1. Modal Tambah Toko (`AdminStoreFormDialog`)
- Tambah field dropdown `BMS Penanggung Jawab` (opsional).
- Dropdown otomatis difilter berdasarkan cabang yang dipilih.
- Saat disimpan, otomatis membuat record `BmsStoreAssignment`.

### 5.2. Modal Edit & Mutasi Toko
- Admin/BMC dapat mengganti BMS penanggung jawab.
- Mutasi dieksekusi secara atomic:
  1. Record lama: `isActive: false`, `unassignedAt: now()`, `unassignedByNIK: current.NIK`.
  2. Record baru: `isActive: true`, `assignedAt: now()`, `assignedByNIK: current.NIK`.

### 5.3. Tabel Toko (`AdminStoresTable`)
- Tambah kolom **BMS Coverage** (Badge Nama & NIK BMS atau `Belum Ditugaskan`).
- Filter tabel berdasarkan BMS.

---

## 6. Engine Perhitungan KPI Preventif BMS

- **Periode:** Kuartal (Q1–Q4) tahun berjalan (`getJakartaQuarterWindow(year, quarter)`).
- **Target Toko:** `COUNT(DISTINCT storeCode)` pada assignment aktif (`isActive = true`).
- **Realisasi:** `COUNT(DISTINCT storeCode)` yang memiliki minimal 1 laporan preventif sah di kuartal berjalan.
- **Pending:** `Target Toko - Realisasi`.
- **Pencapaian KPI (%):** `(Realisasi / Target) * 100%`.

---

## 7. Multi-Role Monitoring Dashboard

1. **BMS Mobile (`/dashboard` & `/dashboard/coverage`):**
   - Progress bar preventif menghitung realisasi terhadap toko coveragenya sendiri.
2. **Dashboard Utama BMC, BNM, & Admin:**
   - Widget ringkasan KPI Preventif BMS: Rata-rata pencapaian cabang & leaderboard performa.
3. **Halaman Performa BMS (`/dashboard/bms-performance`):**
   - Tabel komprehensif seluruh BMS dengan metrik: Target, Selesai, Pending, Progress Bar %, dan tombol dialog "Lihat Rincian Toko".
   - Filter Kuartal & Cabang.
   - Fitur Export Excel Rekapitulasi KPI.
