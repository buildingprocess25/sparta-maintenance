# Deleted Report History Design

## Overview
Menambahkan fitur untuk mencatat dan melihat history laporan maintenance yang dihapus permanen oleh sistem, beserta alasan penghapusannya dan fitur ekspor ke Excel (XLSX).

## Architecture & Database
- **Tabel Baru `DeletedReport`:**
  Daripada merombak seluruh sistem query untuk menggunakan `soft-delete` (yang berisiko tinggi karena terdapat >50 query `Report` aktif), kita akan membuat tabel baru khusus. 
  Tabel ini akan menyimpan snapshot dari laporan yang dihapus beserta rincian penghapusnya.

  **Schema Draft:**
  ```prisma
  model DeletedReport {
    id              String   @id @default(uuid())
    reportNumber    String   @unique
    storeCode       String?
    storeName       String
    itemCount       Int
    totalEstimation Decimal  @db.Decimal(15, 2)
    totalReal       Decimal? @db.Decimal(15, 2)
    lastStatus      String
    
    deletedByNIK    String
    deletedByName   String
    deleteReason    String
    
    deletedAt       DateTime @default(now()) @db.Timestamptz(3)
    
    // Backup data laporan utuh jika sewaktu-waktu dibutuhkan
    originalData    Json 

    @@index([deletedAt])
    @@index([storeCode])
    @@index([deletedByNIK])
  }
  ```

## UI/UX Changes

### 1. Modal Hapus Laporan (Admin)
- **Lokasi:** `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx` -> `AlertDialog` Hapus Permanen.
- **Perubahan:** Menambahkan komponen `Textarea` untuk "Alasan Penghapusan" tepat di bawah input konfirmasi nomor laporan.
- **Validasi:** Alasan penghapusan bersifat wajib (required). Tombol hapus disable jika alasan kosong.

### 2. Tab History Penghapusan
- **Lokasi:** Halaman Laporan Maintenance (`app/dashboard/reports/page.tsx`).
- **Perubahan:** Menambahkan sistem Tab:
  - Tab 1: **Laporan Aktif** (berisi tabel laporan yang saat ini ada)
  - Tab 2: **Laporan Dihapus** (berisi tabel baru yang mengambil data dari tabel `DeletedReport`)
- **Tabel Laporan Dihapus:** Menampilkan sekilas info (No laporan, toko, waktu hapus, alasan, dihapus oleh).

### 3. Ekspor XLSX
- **Lokasi:** Di dalam panel Tab "Laporan Dihapus".
- **Fungsi:** Mengunduh file excel history penghapusan.
- **Kolom Ekspor:**
  1. No Laporan
  2. Kode Toko
  3. Nama Toko
  4. Jumlah Item Terinput (diambil dari `itemCount`)
  5. Nominal Estimasi
  6. Nominal Realisasi
  7. Status Laporan Terakhir (`lastStatus`)
  8. Dihapus Oleh (`deletedByName` / `deletedByNIK`)
  9. Alasan Dihapusnya (`deleteReason`)

## Error Handling & Edge Cases
- **Laporan Tanpa Toko:** Handle `storeCode` yang mungkin null.
- **Laporan yang dihapus di masa lalu:** Data masa lalu tidak dapat direcover karena sudah di-*hard delete* sebelum fitur ini rilis. Fitur ini hanya berlaku ke depan.
