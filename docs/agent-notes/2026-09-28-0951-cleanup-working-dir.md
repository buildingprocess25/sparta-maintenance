# Clean up Git Working Directory

## Scope
Menyimpan sisa-sisa file yang belum di-commit dari aktivitas sebelumnya, termasuk perubahan path import `KpiGrid` dan dokumen perencanaan (design spec & plan).

## Changed Files
- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Menyimpan perubahan import path ke `kpi-cards.tsx` yang sebelumnya terlewat di-commit.
- `docs/superpowers/specs/2026-09-28-sync-active-reports-kpi-design.md`: Menyimpan dokumen spesifikasi desain dari brainstorming sinkronisasi Laporan Aktif.
- `docs/superpowers/plans/2026-09-28-sync-active-reports-kpi-plan.md`: Menyimpan dokumen plan eksekusi.

## Decisions
Mengelompokkan file-file ini ke dalam satu commit kebersihan / housekeeping agar status working tree menjadi bersih dan aman.
