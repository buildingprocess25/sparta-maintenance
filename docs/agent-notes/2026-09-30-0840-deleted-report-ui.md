# Deleted Report History UI

## Scope

Menambahkan UI untuk menghapus laporan secara permanen dengan alasan, serta menampilkan tab history laporan yang dihapus beserta fungsi ekspor ke XLSX.

## Context and Sources

- Implementation Plan: `docs/superpowers/plans/2026-09-30-deleted-report-history-plan.md`
- Melanjutkan backend schema `DeletedReport` yang sudah dicommit sebelumnya.

## Changed Files

- `app/dashboard/reports/actions.ts`: Menyimpan data ke `DeletedReport` saat menghapus.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`: Menambah input alasan pada alert dialog.
- `app/dashboard/reports/_components/deleted-reports-table.tsx`: UI tabel laporan dihapus.
- `app/dashboard/reports/deleted-actions.ts`: Server action fetching data.
- `app/dashboard/reports/page.tsx`: Inject Tabs.

## Decisions

- Ekspor XLSX diletakkan langsung di dalam komponen tabel agar terisolasi dari sistem ekspor lama.
- Komponen dibungkus dalam tab di halaman Laporan Maintenance utama.

## Verification

- File berhasil diedit tanpa error linting syntax.
- Build Next.js perlu dijalankan untuk mengecek tipe.

## Remaining Work and Risks

- None
