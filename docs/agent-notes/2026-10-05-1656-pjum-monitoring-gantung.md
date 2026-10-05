# Monitoring Laporan Gantung PJUM

## Scope

Menambahkan halaman baru `/dashboard/pjum/monitoring-gantung` untuk memantau laporan gantung berdasarkan kategori (BMC Belum, BNM Belum, Gantung Real), penghitungan bucket durasi gantung, serta fitur ekspor Excel.

## Context and Sources

- `docs/superpowers/specs/2026-10-05-pjum-monitoring-gantung-design.md`
- `docs/superpowers/plans/2026-10-05-pjum-monitoring-gantung-plan.md`
- `app/dashboard/pjum/monitoring-gantung/`

## Changed Files

- `app/dashboard/pjum/monitoring-gantung/actions.ts`: Server Action untuk kalkulasi dan grouping data monitoring gantung per BMS.
- `app/dashboard/pjum/monitoring-gantung/page.tsx`: Server Component entry point dengan role authorization check.
- `app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx`: Client Component untuk UI tabel, tab, filter, dan ekspor XLSX.
- `components/app-sidebar.tsx`: Penambahan nav item untuk Monitoring Gantung di bawah Dokumen PJUM.

## Decisions

- Menggunakan Server Action dengan in-memory caching untuk pengambilan data real-time on-demand.
- Ekspor Excel dilakukan dari client menggunakan library `xlsx` dengan opsi `includeEmpty=true` untuk menyertakan seluruh daftar BMS.

## Verification

- Running `npm run build:memory` to verify clean build without TypeScript or bundle errors.

## Remaining Work and Risks

None.
