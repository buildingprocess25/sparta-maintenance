# Deleted Report History

## Scope

Menambahkan fitur pencatatan dan tabel history (beserta ekspor XLSX) untuk laporan maintenance yang dihapus permanen oleh admin. Fitur ini tidak berlaku surut untuk data lama yang sudah terhapus permanen sebelumnya.

## Context and Sources

- Permintaan user untuk menambahkan fitur pencatatan alasan hapus dan history laporan.
- Desain specs: `docs/superpowers/specs/2026-09-30-deleted-report-history-design.md`
- Implementation Plan: `docs/superpowers/plans/2026-09-30-deleted-report-history-plan.md`

## Changed Files

- `prisma/schema.prisma`: Menambah tabel `DeletedReport`.
- `app/dashboard/reports/actions.ts`: Mengubah `deleteAdminReport` untuk menyimpan `DeletedReport` sebelum hard-delete.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`: Menambah input Alasan Hapus.
- `app/dashboard/reports/_components/deleted-reports-table.tsx`: Komponen tabel history.
- `app/dashboard/reports/deleted-actions.ts`: Server action untuk mengambil history.
- `app/dashboard/reports/page.tsx`: Modifikasi UI untuk menambahkan Tabs Laporan Aktif vs Laporan Dihapus.

## Decisions

- Menggunakan tabel baru `DeletedReport` daripada `soft-delete` untuk menghindari perombakan pada puluhan query aktif yang menggunakan tabel `Report`.
- Kolom `deleteReason` dibuat wajib agar terdokumentasi dengan baik.

## Verification

- Menulis model Prisma, menjalankan `prisma generate`.
- Memastikan tipe data dan properti UI sinkron.

## Remaining Work and Risks

- User belum/perlu menjalankan migrasi prisma secara mandiri karena keterbatasan rule execution.
