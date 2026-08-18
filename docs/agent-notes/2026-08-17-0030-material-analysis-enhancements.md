# Material Analysis Enhancements

## Scope

- Membuat komponen popup `ExportMaterialAnalysisDialog` mandiri untuk export XLSX.
- Mengubah kolom tabel `reportNumber` menjadi klikable mengarah ke halaman laporan dengan style dari `admin-reports-table`.
- Menyesuaikan ukuran dan kepadatan tabel mengikuti styling `admin-reports-table.tsx`.

## Changed Files

- `app/admin/material-analysis/export-dialog.tsx`: Komponen baru.
- `app/admin/material-analysis/client.tsx`: Import komponen dialog, ganti styling button export lama, implementasi style tabel dan Link.

## Remaining Work and Risks
None.
