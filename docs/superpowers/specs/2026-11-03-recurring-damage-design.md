# Kerusakan Berulang — Design

Tanggal: 2026-11-03
Halaman baru: `/dashboard/recurring-damage` (Admin, BMC, BNM)

## Latar belakang

Stakeholder ingin data laporan yang sudah ada diolah menjadi informasi:

1. **Level cabang**: toko mana yang problematik, yaitu toko yang punya item
   checklist yang sama rusak berulang kali (lebih dari 1x).
2. **Level toko**: di toko tertentu dalam periode berjalan, item mana dari
   128 item checklist yang rusaknya terdeteksi lebih dari 1x, dan bisa
   ditelusuri sampai nomor laporannya.

Saat ini belum ada halaman yang menjawab ini. Data yang dibutuhkan sudah
tersedia di `Report.items` (JSONB), satu entri per `itemId` per laporan.

## Fakta data yang menjadi dasar

- Katalog 128 item ada di `lib/checklist-data.ts`: kategori A–H (115 item)
  memakai `condition` (`BAIK` / `RUSAK` / `TIDAK_ADA`), kategori I (13 item)
  memakai `preventiveCondition` (`OK` / `NOT_OK` / `TIDAK_ADA`).
- Signage I11–I13 punya kondisi asli di `signageCondition`
  (`BAIK` / `KOTOR` / `PUDAR` / `RUSAK`). Pudar dan Rusak disimpan sebagai
  `preventiveCondition = NOT_OK`, Kotor sebagai `OK` (`lib/signage.ts`).
- Revisi laporan menimpa `items` pada `reportNumber` yang sama, jadi siklus
  revisi tidak menghasilkan deteksi ganda.
- Kunjungan preventif pertama toko di suatu kuartal wajib memuat seluruh 115
  item A–H (`app/reports/actions/submit.ts`). Laporan lain di kuartal yang
  sama boleh memuat sebagian item. Akibatnya kerusakan yang tidak kunjung
  diperbaiki cenderung tercatat lagi di kunjungan kuartal berikutnya. Karena
  itu setiap deteksi ditampilkan bersama status laporannya.

## Definisi

### Deteksi rusak

Satu **deteksi** adalah satu entri item di `Report.items` yang memenuhi
salah satu:

- `condition = 'RUSAK'`, atau
- `preventiveCondition = 'NOT_OK'` (termasuk signage Pudar dan Rusak).

`BAIK`, `OK`, `TIDAK_ADA`, dan signage Kotor bukan deteksi. Satu laporan
menyumbang paling banyak satu deteksi per `itemId`.

### Laporan yang dihitung

Laporan dihitung bila:

- `status` bukan `DRAFT`, `ARCHIVED_PREVENTIVE`, atau `ESTIMATION_REJECTED`;
- `storeCode` tidak null dan menunjuk ke toko aktif (`Store.isActive = true`);
- `createdAt` berada di dalam periode filter.

### Item berulang

Pasangan (toko, `itemId`) adalah **item berulang** bila punya **≥ 2 deteksi**
dari laporan berbeda dalam periode filter. Hitungan ini sederhana: tidak
melihat apakah laporan sebelumnya sudah selesai. Status setiap laporan
ditampilkan di penelusuran agar pengguna bisa membedakan kerusakan yang
kambuh setelah diperbaiki dari kerusakan yang belum beres.

### Toko problematik

Toko aktif yang punya **minimal satu item berulang** dalam periode filter.

### Atribusi cabang

Cabang ditentukan dari **cabang toko saat ini** (`Store.branchName`), bukan
`Report.branchName`. Bila toko pindah cabang, seluruh riwayat deteksinya ikut
ke cabang baru. Pola ini sama dengan dashboard Preventif dan Coverage BMS.

### Periode

Filter bertingkat **Tahun → Kuartal → Bulan**, semua berbasis WIB dan
`Report.createdAt`:

- Tahun wajib. Default: tahun berjalan (`getJakartaYear`).
- Kuartal opsional. Default: semua kuartal.
- Bulan opsional dan hanya bisa dipilih setelah kuartal dipilih. Pilihannya
  hanya bulan di kuartal itu (Q2 = Apr/Mei/Jun).

Rentang waktu memakai `getJakartaYearWindow`, `getJakartaQuarterWindow`, dan
`getJakartaMonthWindow` dari `lib/time.ts`. Filter per bulan wajar sering
kosong karena satu toko jarang punya ≥ 2 laporan dengan item yang sama dalam
sebulan.

### Ukuran per toko

Untuk setiap toko problematik:

- **Frekuensi maksimum**: jumlah deteksi terbanyak di antara item berulangnya.
- **Item dengan frekuensi maksimum**: item yang mencapai frekuensi itu. Bila
  lebih dari satu, ambil yang paling awal menurut `compareChecklistItemIds`.
- **Jumlah item berulang**: banyaknya `itemId` dengan ≥ 2 deteksi.

Urutan daftar toko: frekuensi maksimum (turun), lalu jumlah item berulang
(turun), lalu kode toko (naik).

## Akses

| Role | Cakupan cabang | Brand |
|---|---|---|
| `ADMIN` | Semua cabang kecuali `HEAD OFFICE` (`EXCLUDED_ADMIN_BRANCH_NAME`) | Filter brand tersedia (`lib/store-brand-filter.ts`) |
| `BMC` | `branchNames[0]` | Semua brand |
| `BNM_MANAGER` | `branchNames[0]` | Semua brand |

Role lain diarahkan ke `/dashboard`. Cakupan cabang dihitung di server,
termasuk pada endpoint export. Parameter `branch` dari URL diabaikan untuk
BMC dan BNM.

## Tampilan

Halaman memakai `AdminDashboardShell` dengan judul **"Kerusakan Berulang"**
dan masuk ke grup **Monitoring** di `components/app-sidebar.tsx`, tampil
untuk Admin, BMC, dan BNM.

Semua state disimpan di URL: `year`, `quarter`, `month`, `brand` (Admin),
`branch` (Admin), dan `store`.

### Layer 1 — Cabang

- **Admin tanpa `branch`**: tabel cabang berisi nama cabang dan **jumlah toko
  problematik**, diurutkan dari jumlah terbanyak lalu nama cabang. Cabang
  dengan nol toko problematik tetap tampil dengan angka 0. Klik baris
  mengatur `?branch=`.
- **Admin dengan `branch`**, **BMC**, **BNM**: satu angka ringkasan "N toko
  problematik" untuk cabang itu, diikuti Layer 2. Admin mendapat tautan
  kembali ke daftar cabang.

### Layer 2 — Toko

Tabel toko problematik dengan kolom: kode toko, nama toko, item dengan
frekuensi maksimum (ID + nama), frekuensi maksimum, dan jumlah item berulang.
Urutan sesuai definisi di atas. Ada input pencarian kode/nama toko yang
memfilter di klien. Data dimuat sekaligus, tanpa paginasi server.

Klik baris toko mengatur `?store=` dan membuka panel samping.

### Layer 3 dan 4 — Panel toko

Panel samping memakai `Sheet` shadcn/ui. Lebarnya penuh di layar kecil.

- Header: kode, nama toko, cabang, periode aktif.
- **Layer 3**: daftar item berulang toko itu, diurutkan berdasarkan jumlah
  deteksi (turun) lalu `compareChecklistItemIds`. Setiap baris memuat ID,
  nama item, kategori, dan jumlah deteksi. Setiap item bisa dibuka.
- **Layer 4**: deteksi untuk item itu, diurutkan berdasarkan `createdAt`
  (naik). Setiap baris memuat nomor laporan (tautan ke
  `/dashboard/reports/[reportNumber]`), tanggal laporan, badge status
  (`getReportStatusLabel`, `getReportStatusBadgeClass`), handler
  (`BMS` / `REKANAN`), catatan, dan kondisi asli signage untuk I11–I13.

Bila `?store=` menunjuk toko di luar cakupan pengguna, atau toko itu tidak
punya item berulang di periode aktif, panel menampilkan pesan kosong. Data
toko lain tidak dibocorkan.

### Tampilan kosong dan error

- Tidak ada toko problematik: "Tidak ada toko dengan item rusak berulang di
  periode ini."
- Gagal memuat: pesan gagal memuat di halaman. Error dicatat lewat
  `lib/logger.ts`.

## Export XLSX

Tombol **"Ekspor XLSX"** (label yang sama dengan export lain) di header
halaman mengunduh file sesuai filter aktif (`year`, `quarter`, `month`,
`brand`, `branch`). Tidak ada dialog terpisah.

Endpoint baru: `app/api/dashboard/recurring-damage/export/route.ts`. Polanya
mengikuti `app/api/dashboard/preventive/annual-matrix-export/route.ts`:
memakai library `xlsx`, mengecek auth dan role, lalu menerapkan cakupan
cabang yang sama dengan halaman.

Isi file:

- **Sheet "Ringkasan Toko"**: satu baris per toko problematik dengan urutan
  Layer 2. Kolom: cabang, kode toko, nama toko, frekuensi maksimum, item
  dengan frekuensi maksimum (ID + nama), jumlah item berulang.
- **Sheet "Detail Deteksi"**: satu baris per deteksi pada item berulang,
  diurutkan berdasarkan cabang, urutan toko, `itemId`, lalu `createdAt`.
  Kolom: cabang, kode toko, nama toko, ID item, nama item, kategori, nomor
  laporan, tanggal laporan, status, handler, kondisi asli signage, catatan.

Tanggal memakai `toExcelJakartaSerial`. Nama file mengikuti pola export
matriks preventif:
`Kerusakan_Berulang_<Cabang|Semua_Cabang>_<tahun>[_TW<n>][_<MM>].xlsx`.

## Arsitektur

Tanpa tabel baru dan tanpa migrasi. Logic murni dipisah dari query, dan query
dipisah dari pengecekan akses.

### `lib/recurring-damage.ts` (murni, tanpa I/O)

- `isDamagedItem(item)`: aturan deteksi rusak.
- `RECURRING_DAMAGE_EXCLUDED_STATUSES` dan `isRecurringDamageCountedStatus`:
  `DRAFT`, `ARCHIVED_PREVENTIVE`, `ESTIMATION_REJECTED` tidak dihitung.
- `isValidRecurringDamagePeriod`, `normalizeRecurringDamagePeriod`,
  `getRecurringDamageWindow`, `formatRecurringDamagePeriod`: validasi filter
  periode, rentang `[start, endExclusive)` WIB, dan label periode.
- `buildRecurringDamageStores(detections)`: menerima daftar deteksi
  `{ branchName, storeCode, storeName, itemId, reportNumber, createdAt,
  status, condition, preventiveCondition, handler, notes, signageCondition,
  signageMaterial }` (`branchName` dan `storeName` dari `Store`),
  mengembalikan toko problematik beserta ukurannya, item berulang, dan
  deteksinya, sudah dalam urutan yang ditetapkan.
- `summarizeRecurringDamageBranches(branchNames, stores)`: jumlah toko
  problematik per cabang untuk Layer 1.

### `app/dashboard/recurring-damage/detections-query.ts`

`fetchDamageDetections({ stores, start, endExclusive })`: satu query SQL
mentah (`prisma.$queryRaw`) yang membuka `jsonb_array_elements(r."items")`,
dibatasi ke `storeCode` toko yang diberikan, rentang `createdAt`, dan status
yang dihitung. Query hanya mengembalikan entri yang rusak. Nama toko dan
cabang diambil dari daftar `Store` yang diberikan. File ini tidak mengecek
akses, sehingga bisa dijalankan dari script verifikasi.

### `app/dashboard/recurring-damage/queries.ts` (server-only)

`loadRecurringDamage(filters)`: mengecek user dan role (`getAuthUser`,
melempar `Unauthorized`), menentukan cakupan toko, memanggil
`fetchDamageDetections`, lalu `buildRecurringDamageStores` dan
`summarizeRecurringDamageBranches`. Dipakai oleh halaman dan endpoint export.

Cakupan toko berupa `Prisma.StoreWhereInput` dengan `isActive: true` dan:

- Admin: `branchName` bukan `EXCLUDED_ADMIN_BRANCH_NAME`, ditambah
  `branchName = branch` bila `branch` dipilih, ditambah
  `getStoreBrandWhere(brand)`.
- BMC dan BNM: `branchName = branchNames[0]`.

Pilihan cabang dan tahun memakai `getPreventiveBranchOptions` dan
`getReportYears` yang sudah ada.

### UI

- `app/dashboard/recurring-damage/page.tsx`: server component. Membaca
  `searchParams`, mengecek role, dan memanggil `loadRecurringDamage`.
  Perubahan filter memakai `router.replace` sehingga halaman dirender ulang di
  server. Tidak ada server action tambahan.
- Panel toko dibuka/ditutup dengan `window.history.replaceState` (`?store=`)
  karena datanya sudah ada di klien; tidak perlu memuat ulang dari server.
- `app/dashboard/recurring-damage/_components/`: filter, tabel cabang, tabel
  toko, panel toko, dan tombol export.
- Komponen kecil yang dipakai halaman Preventif dan halaman ini dipindahkan ke
  `components/dashboard/` (`MetricColumn`, `EmptyTable`,
  `ReportStatusBadge`) tanpa perubahan tampilan, agar kedua halaman memakai
  komponen yang sama.

## Pengujian

- `lib/recurring-damage.spec.ts`:
  - deteksi rusak untuk A–H, I1–I10, dan signage Baik/Kotor/Pudar/Rusak
  - pengecualian status
  - ambang ≥ 2 deteksi
  - ukuran per toko dan urutan tie-break
  - validasi periode: bulan di luar kuartal ditolak, bulan tanpa kuartal
    ditolak
- Script verifikasi sementara di database lokal: ukur durasi
  `fetchDamageDetections` untuk semua cabang selama satu tahun, dan pastikan
  tidak ada signage Pudar/Rusak yang tersimpan selain `NOT_OK`. Bila durasi
  lebih dari 2 detik, jalankan `EXPLAIN ANALYZE` dan catat temuannya.
- Cek manual di browser sebagai Admin, BMC, dan BNM:
  - filter tahun, kuartal, dan bulan
  - drill-down cabang → toko → panel
  - tautan ke detail laporan
  - `?store=` di luar cakupan
  - isi dan cakupan file export

## Di luar cakupan

- Akses BMS dan tampilan mobile BMS.
- Akses Branch Admin.
- Definisi "rusak lagi setelah diperbaiki" sebagai metrik terpisah.
- Perbandingan dengan total toko aktif atau persentase di Layer 1.
- Tabel ringkasan atau cache untuk deteksi.
- Tautan dari halaman lain (detail laporan, master toko) ke halaman ini.
