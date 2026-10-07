# BMS Store Coverage Binding & Preventive KPI Monitoring Design

## Scope

Perancangan arsitektur dan spesifikasi teknis untuk mengikat penugasan toko spesifik ke setiap BMS (`BmsStoreAssignment`), menutup celah pelaporan di luar wilayah coverage, serta memfasilitasi monitoring KPI preventif berbasis kuartal di level BMS, BMC, BNM, dan Admin.

## Context and Sources

- Permintaan user terkait batasan pelaporan BMS dan monitoring KPI preventif.
- File master data: `C:\Users\Rendi Elang\Downloads\TOKO BMS AGUSTUS 2026.xlsx`.
- Codebase: `prisma/schema.prisma`, `app/reports/(bms)/create/`, `app/dashboard/preventive/actions.ts`, `app/dashboard/bms-performance/`.

## Changed Files

- `docs/plans/2026-10-07-bms-store-coverage-kpi-design.md`: Dokumen rancangan desain teknis menyeluruh.
- `docs/agent-notes/2026-10-07-1402-bms-coverage-kpi-design.md`: Task note sesi brainstorming dan perancangan desain.

## Decisions

- Menggunakan tabel relasi terdedikasi `BmsStoreAssignment` dengan partial unique index di PostgreSQL (`WHERE "isActive" = true`) agar mendukung riwayat mutasi toko tanpa kehilangan data historis penugasan.
- Menutup celah pelaporan secara ketat di sisi server action `submitReport`: BMS hanya dapat membuat laporan untuk toko coveragenya.
- Mengintegrasikan penugasan BMS langsung pada modal tambah/edit toko di dashboard Admin/BMC.
- Menghitung KPI preventif per kuartal berjalan (Q1-Q4) secara akurat berdasarkan toko coverage aktif.
- Menampilkan monitoring di halaman `Performa BMS` (`/dashboard/bms-performance`) dan widget overview di dashboard utama BMC, BNM, dan Admin.

## Verification

- Telah menganalisis 21.891 baris data Excel `TOKO BMS AGUSTUS 2026.xlsx`, memverifikasi kecocokan data dengan tabel `Store` (99.9%) dan `User` (96.6%).
- Konfirmasi dan kesepakatan desain bersama user per bagian (Database, Form Protections, Store Management, dan KPI Monitoring).

## Remaining Work and Risks

- Implementasi skema Prisma migration.
- Pembuatan skrip CLI migrasi master data Excel.
- Pembuatan implementasi form guard, UI manajemen toko, dan modul monitoring KPI preventif (akan dipetakan di implementation plan).
