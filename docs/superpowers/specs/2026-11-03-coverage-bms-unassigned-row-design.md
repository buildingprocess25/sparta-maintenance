# Baris "Belum di-assign" di Tabel Coverage BMS — Design

Tanggal: 2026-11-03
Halaman terdampak: `/dashboard/preventive` tab Coverage BMS (Admin, BMC, BNM)

## Latar belakang

Di dashboard Checklist Preventif, card ringkasan dan tabel Coverage BMS
menampilkan target toko yang berbeda. Contoh CIANJUR Q4 2026:

| | Target | Sudah | Belum |
|---|---|---|---|
| Card atas | 610 | 334 | 276 |
| Tabel Coverage BMS (baris cabang) | 563 | 315 | 248 |

Penyebabnya, kedua angka menghitung himpunan toko yang berbeda:

- Card (`getAdminPreventive`, `app/dashboard/preventive/actions.ts`) menghitung
  **semua toko aktif** di scope cabang lewat `prisma.store.findMany`.
- Tabel (`getBmsCoverageHierarchy`,
  `app/dashboard/preventive/coverage-hierarchy-action.ts`) berangkat dari
  `prisma.bmsStoreAssignment.findMany`. Akibatnya hanya **toko aktif yang punya
  assignment BMS aktif** yang terhitung.

Kriteria "sudah checklist" di keduanya setara (laporan non-DRAFT, bukti
preventif lengkap, `createdAt` di kuartal terpilih). Selisih 47 / 19 / 28 di
CIANJUR adalah toko aktif tanpa BMS penanggung jawab.

Masalah kedua: total cabang di tabel saat ini adalah **jumlah total per BMS**.
`BmsStoreAssignment` tidak punya unique constraint per toko, jadi toko dengan
dua assignment aktif terhitung dua kali di total cabang.

## Tujuan

1. Baris cabang di tabel Coverage BMS menampilkan angka yang sama dengan card,
   yaitu dihitung dari toko aktif unik di cabang.
2. Toko aktif tanpa assignment BMS terlihat di tabel sebagai grup
   "Belum di-assign BMS" per cabang, beserta daftar tokonya.
3. Untuk toko unassigned yang sudah di-checklist, tampilkan BMS pembuat
   laporannya sebagai petunjuk untuk penugasan.
4. Admin/BMC bisa langsung membuka halaman Data Toko untuk toko unassigned agar
   bisa meng-assign BMS.

## Lapisan data

### Tipe

Di `coverage-hierarchy-action.ts`:

```ts
export type UnassignedStoreItem = StoreCoverageHierarchyItem & {
    doneByName?: string; // nama pembuat laporan preventif terbaru di kuartal
};

export type UnassignedCoverage = {
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    stores: UnassignedStoreItem[];
};

export type BranchCoverageHierarchy = {
    branchName: string;
    bmsCount: number;
    totalStores: number;       // toko aktif unik di cabang (termasuk unassigned)
    completedStores: number;   // toko unik yang sudah checklist
    pendingStores: number;
    coverageRate: number;
    bmsList: BmsCoverageHierarchyItem[];
    unassigned: UnassignedCoverage | null; // null jika semua toko ter-assign
};
```

Tipe `BmsCoverageHierarchyItem` dan `StoreCoverageHierarchyItem` tidak berubah.
Tidak ada perubahan `schema.prisma` atau migrasi.

### Query (`getBmsCoverageHierarchy`)

1. `prisma.store.findMany` dengan filter yang sama seperti query sekarang:
   `isActive: true`, `branchName` bukan `EXCLUDED_ADMIN_BRANCH_NAME`, filter
   cabang jika ada, dan `getStoreBrandWhere` jika brand bukan `ALL`. Select
   `code`, `name`, `branchName`, dan relasi
   `storeAssignments: { where: { isActive: true }, select: { bmsNIK, bms: { select: { name } } } }`.
2. Jika tidak ada toko, kembalikan `[]`.
3. Query laporan sama dengan sekarang (`storeCode in`, window kuartal, non-DRAFT,
   disaring `isRecordedPreventiveReport`), ditambah select `createdByNIK` dan
   `createdBy: { select: { name: true } }`. Peta per toko menyimpan laporan
   terbaru: `reportNumber`, `doneAt`, `doneByName`
   (`createdBy.name || createdByNIK`).
4. Serahkan toko dan peta laporan ke `buildCoverageHierarchy`.

### Fungsi murni `buildCoverageHierarchy`

File baru `app/dashboard/preventive/coverage-hierarchy.ts`, tanpa Prisma dan
tanpa `"use server"` (file `"use server"` hanya boleh mengekspor fungsi async).
Input: daftar toko (kode, nama, cabang, daftar assignment `{ bmsNIK, bmsName }`)
dan peta laporan per kode toko. Output: `BranchCoverageHierarchy[]`.

Aturan:

- Cabang = `store.branchName || "TANPA CABANG"`.
- Toko dengan ≥1 assignment masuk ke setiap BMS-nya (nama BMS fallback ke NIK),
  dengan dedup per BMS seperti sekarang.
- Toko tanpa assignment masuk ke `unassigned` cabangnya, dengan `doneByName`
  dari laporan.
- Angka BMS (`totalStores`, `completedStores`, `pendingStores`, `kpiRate`)
  dihitung seperti sekarang.
- Angka cabang dihitung dari **himpunan kode toko unik** di cabang, bukan dari
  penjumlahan angka BMS.
- `coverageRate` (cabang dan unassigned) memakai pembulatan yang sama seperti
  sekarang: `Math.round((completed / total) * 1000) / 10`.
- `unassigned` bernilai `null` jika cabang tidak punya toko unassigned.
- Cabang tanpa assignment sama sekali tetap muncul (`bmsList` kosong,
  `bmsCount: 0`, `unassigned` berisi semua tokonya).
- Urutan: BMS per nama, toko per nama, cabang per nama, sama seperti sekarang.
  Toko unassigned diurutkan per nama.

## Tampilan

File: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`.

### Baris "Belum di-assign BMS"

- Baris level 2 (setingkat BMS), dirender **setelah semua baris BMS** di cabang
  yang di-expand, hanya jika `branch.unassigned` tidak `null`.
- Isi kolom pertama: chevron, ikon `UserX` (lucide), label
  "Belum di-assign BMS", subjudul kecil "Toko aktif tanpa BMS penanggung jawab".
- Kolom angka: `totalStores`, `completedStores`, `pendingStores`, dengan gaya yang
  sama seperti baris BMS.
- Kolom pencapaian: badge "Pencapaian: {coverageRate}%" dengan aturan warna yang
  sama seperti BMS.
- Latar baris amber tipis supaya berbeda dari baris BMS.
- Kunci expand: `unassigned:<branchName>` di state `expandedBms`.

### Rincian toko unassigned

Saat di-expand, tampil panel yang sama gayanya dengan rincian toko BMS, berjudul
"Toko Belum Di-assign ({n} Toko)". Kolomnya:

| Kode Toko | Nama Toko | Status Preventif | Dikerjakan oleh | No. Laporan |
|---|---|---|---|---|

- **Kode Toko**: jika `canManageStores`, tampil sebagai `Link` ke
  `/dashboard/stores?search=<kode>&branch=<cabang>` dengan `target="_blank"`.
  Jika tidak, tampil sebagai teks mono biasa.
- **Status Preventif**: badge Selesai/Pending yang sama dengan rincian BMS.
- **Dikerjakan oleh**: `doneByName`, atau "-" jika belum di-checklist.
- **No. Laporan**: tautan laporan yang sama dengan rincian BMS.

### Prop baru

`canManageStores?: boolean` (default `false`) di `BmsCoverageHierarchyTable`.
`admin-preventive-table.tsx` mengisinya dengan `showBranchControls || isBmc`
(`showBranchControls` hanya true untuk Admin). Hasilnya true untuk Admin dan
BMC, sesuai akses halaman `/dashboard/stores`.

### Pencarian

- Query yang cocok dengan nama cabang menampilkan cabang itu utuh, termasuk
  baris unassigned.
- Query yang cocok dengan kode/nama toko unassigned menampilkan baris
  unassigned dengan toko yang cocok saja. Cabangnya tetap tampil walaupun tidak
  ada BMS yang cocok.
- Query nama/NIK BMS tidak memunculkan baris unassigned (kecuali cabangnya
  cocok).
- Angka di baris cabang dan baris unassigned tetap angka penuh, tidak dihitung
  ulang dari hasil filter. Ini sama dengan perilaku baris BMS sekarang.

### Pengurutan

- Sort BMS (Terendah/Tertinggi Dulu) tidak menyentuh baris unassigned. Baris itu
  tetap paling bawah.
- Sort cabang memakai `coverageRate` cabang yang baru (semua toko aktif).

### Baris cabang

Angka cabang mengikuti data baru (CIANJUR: 610 / 334 / 276). Badge tetap
"{bmsCount} BMS" dan menampilkan "0 BMS" untuk cabang tanpa assignment.

## Kasus tepi

| Kasus | Perilaku |
|---|---|
| Toko punya 2+ assignment aktif | Tampil di setiap BMS-nya, dihitung sekali di total cabang |
| Assignment ke BMS nonaktif / beda cabang | Tetap dihitung ter-assign (tidak berubah) |
| Toko tanpa `branchName` | Grup "TANPA CABANG" (tidak berubah) |
| Toko unassigned di-checklist >1 kali dalam kuartal | Pakai laporan terbaru, termasuk untuk `doneByName` |
| Pembuat laporan tanpa nama / sudah dihapus | `doneByName` = `createdByNIK` |
| Semua toko cabang ter-assign | `unassigned: null`, tidak ada baris tambahan |

## Pengujian

- `app/dashboard/preventive/coverage-hierarchy.spec.ts` (pola `node:assert`
  seperti `preventive-dashboard.spec.ts`, dijalankan dengan
  `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`). Kasus yang
  diuji:
  - toko tanpa assignment masuk `unassigned` dengan angka benar
  - `unassigned` bernilai `null` jika semua toko ter-assign
  - cabang tanpa assignment tetap muncul dengan `bmsCount: 0`
  - toko dengan dua assignment muncul di kedua BMS, tapi dihitung sekali di
    total cabang
  - `doneByName` terisi dari laporan; toko pending tanpa `doneByName`
  - total cabang = toko unik, dan completed cabang = toko unik selesai
- Cek manual di dev server, `/dashboard/preventive`:
  - CIANJUR Q4 2026: angka baris cabang sama dengan card, baris unassigned
    sesuai selisih sebelumnya
  - tautan kode toko muncul untuk Admin dan BMC, dan tidak muncul untuk BNM
  - pencarian kode toko unassigned dan sort tetap berperilaku seperti di atas
- `npm run lint`.

## Di luar scope

- Unique constraint `BmsStoreAssignment` per toko dan pembersihan data ganda
  (perlu perubahan schema dan migrasi data).
- Filter "belum di-assign" di halaman Data Toko.
- Perubahan pada card ringkasan, tab lain, atau ekspor XLSX.
- Mengisi assignment yang kurang. Itu pekerjaan data oleh BMC.
