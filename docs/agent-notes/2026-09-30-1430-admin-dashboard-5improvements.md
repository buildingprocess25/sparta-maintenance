# Admin Dashboard 5 Improvements

## Scope

- [Poin 1] Export XLSX + tooltip Total Realisasi + kecilkan margin bawah chart
- [Poin 4] Kecilkan padding-Y 5 card footer stats
- [Poin 5] Tambah kolom "Jumlah Laporan" di XLSX export SLA Proses

## Changed Files

- app/dashboard/queries.ts
- app/dashboard/_components/admin/realisasi-chart-widget.tsx
- app/dashboard/_components/admin/admin-dashboard-v2.tsx
- app/dashboard/branches/actions.ts
- app/dashboard/branches/_components/admin-sla-table.tsx

## Decisions

- Field `total` di RealisasiBranchStat dihitung hanya dari `validVals >= 1000` (konsisten dengan `avg`) untuk menghindari nilai noise dari laporan uji coba.
- `COUNT(*)` di PostgreSQL mengembalikan `bigint` sehingga perlu `Number()` cast di TypeScript.
- Hidden `<Line dataKey="total">` digunakan untuk menjaga urutan tooltip Recharts (count -> total -> avg) tanpa menampilkan garis ekstra di chart.
