# Update Export Tipe Toko dan Label Filter

## Scope

Tugas ini menambahkan kolom "Tipe Toko" ke hasil ekspor data toko XLSX serta mengubah label dropdown "Tipe Toko" untuk value UNKNOWN dari "-" menjadi "Tidak Diketahui" di dashboard manajemen toko.

## Context and Sources

- Permintaan pengguna untuk menyesuaikan label UX dan menambahkan field ke ekspor XLSX.
- Fitur ekspor Excel dan tabel pada `app/dashboard/stores`.

## Changed Files

- `app/dashboard/stores/actions.ts`: Menambahkan pengambilan `ownershipType` ke `select` di query `exportAdminStores`.
- `app/dashboard/stores/_components/export-stores-dialog.tsx`: Menambahkan kolom `Tipe Toko` beserta logic konversi nilainya dan memperbarui jumlah kolom.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: Mengubah label `UNKNOWN` dari `"-"` menjadi `"Tidak Diketahui"` di `OWNERSHIP_FILTER_OPTIONS` dan helper `formatOwnershipLabel`.

## Decisions

- Tidak meminta feedback planning secara khusus karena task ini sangat simple (mengubah mapping string).

## Verification

- File syntax telah diverifikasi aman karena typescript di-handle dengan proper (misal tipe yang sesuai string union).

## Remaining Work and Risks

None
