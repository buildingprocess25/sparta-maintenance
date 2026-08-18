# Material Analysis Fixes

## Scope

Memperbaiki bug pada fitur Analisa Material:
1. Filter Brand yang sebelumnya tidak diterapkan ke Prisma query.
2. Mengeksklusikan laporan dari HEAD OFFICE.
3. Mengembalikan warna tombol Ekspor XLSX ke warna primary bawaan.
4. Menampilkan nama Item Rusak dengan melakukan fallback ke checklist metadata jika field `itemName` kosong.
5. Menggunakan `fetchAllBranchNames` agar daftar cabang identik dengan tab laporan maintenance.

## Context and Sources

- User feedback mengenai bug setelah implementasi awal fitur analisa material.

## Changed Files

- `app/admin/material-analysis/actions.ts`: Memperbaiki prisma query, fallback itemName, dan source daftar cabang.
- `app/admin/material-analysis/client.tsx`: Menghapus warna hijau yang hardcoded pada tombol Ekspor.

## Decisions

- Untuk menghindari duplikasi logika pencarian cabang admin dan filter khusus HEAD OFFICE, kita mereuse fungsi `fetchAllBranchNames` dan variabel `EXCLUDED_ADMIN_BRANCH_NAME` dari lingkup aplikasi.

## Verification

- Data di actions.ts sudah memfilter HEAD OFFICE.
- Tombol di client.tsx tidak lagi menggunakan warna kustom.

## Remaining Work and Risks

None.
