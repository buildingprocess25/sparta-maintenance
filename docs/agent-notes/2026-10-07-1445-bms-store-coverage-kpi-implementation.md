# BMS Store Coverage and KPI Implementation

## Scope

- Menambahkan skema relasi penugasan toko ke BMS (`BmsStoreAssignment`) dengan PostgreSQL Partial Unique Index (`unique_active_store_assignment WHERE "isActive" = true`) dan file migrasi SQL DDL.
- Menyediakan CLI script import data master Excel toko BMS (`scripts/import-bms-store-assignments.ts`) dengan normalisasi NIK 8-digit, logging toko vacant, dan script package.json `import:bms-assignments`.
- Mengimplementasikan server-side form protection & guard di create, revisi, edit, dan submit report agar BMS hanya dapat membuat laporan untuk toko di wilayah binaannya.
- Mengintegrasikan manajemen toko di Admin/BMC dashboard (`/dashboard/stores` dan `/admin/database`) dengan kolom BMS Coverage, filter BMS, dropdown pemilihan BMS, dan server action `assignStoreToBms` yang mendukung mutasi historis.
- Memperbarui Quarterly Preventive KPI calculation engine di level mobile BMS (`getBmsPreventiveCoverage`), BMC, BNM, dan Admin (`/dashboard/bms-performance`) dengan rincian status toko per kuartal dan dialog interaktif.
- Membuka akses navigasi menu "Performa BMS" di sidebar untuk role ADMIN.
- Sesuai instruksi pengguna: tidak menjalankan command Prisma maupun script import database secara otomatis, melainkan menyediakan tutor panduan eksekusi mandiri untuk pengguna.

## Context and Sources

- Permintaan pengguna terkait pembatasan pelaporan BMS hanya pada toko coverage masing-masing dan monitoring KPI kuartalan preventif.
- Dokumen desain teknis: `docs/plans/2026-10-07-bms-store-coverage-kpi-design.md`.
- Dokumen rencana implementasi: `docs/plans/2026-10-07-bms-store-coverage-kpi-plan.md`.
- File master data: `"C:\Users\Rendi Elang\Downloads\TOKO BMS AGUSTUS 2026.xlsx"`.
- Canonical doc: `docs/project/06-database.md`.

## Changed Files

- `prisma/schema.prisma`: Penambahan model `BmsStoreAssignment` dan relasi ke `User` dan `Store`.
- `package.json`: Penambahan script npm `import:bms-assignments`.
- `scripts/import-bms-store-assignments.ts`: CLI script import batch master penugasan toko BMS.
- `app/reports/actions/queries.ts`: Penambahan query `getAssignedStoresForBms`.
- `app/reports/actions.ts`: Export `getAssignedStoresForBms`.
- `app/reports/(bms)/create/page.tsx`: Penggunaan `getAssignedStoresForBms` pada form pembuatan laporan.
- `app/reports/(bms)/edit/[id]/page.tsx`: Penggunaan `getAssignedStoresForBms`.
- `app/reports/(bms)/revisi/[reportNumber]/page.tsx`: Penggunaan `getAssignedStoresForBms`.
- `app/reports/actions/submit.ts`: Guard validasi aktif toko coverage BMS pada submit report.
- `app/dashboard/stores/actions.ts`: Penambahan `assignStoreToBms`, query filter `bmsNIK`, dan select `storeAssignments`.
- `app/admin/database/_components/store-form-dialog.tsx`: Field dropdown penugasan BMS pada modal create/edit toko.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: Kolom tabel "BMS Coverage" dan badge status coverage.
- `app/dashboard/preventive/actions.ts`: Refactor `getBmsPreventiveCoverage` join ke `BmsStoreAssignment`.
- `components/app-sidebar.tsx`: Pembukaan akses menu "Performa BMS" untuk role ADMIN.
- `app/dashboard/bms-performance/actions.ts`: Role viewer ADMIN, kalkulasi KPI preventif kuartalan, dan detail toko binaan.
- `app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx`: Dialog interaktif rincian toko coverage & status preventif kuartal.
- `app/dashboard/bms-performance/page.tsx`: Penambahan kolom KPI preventif kuartalan dan dialog detail toko pada tabel performa BMS.
- `docs/project/06-database.md`: Dokumentasi model `BmsStoreAssignment`.
- `docs/plans/task.md`: Checklist status pengerjaan fitur.
- `tests/*`: 14 unit test suite otomatis (schema, import script, form guard, store assignment UI, kpi engine, performance monitoring).

## Decisions

- Menggunakan PostgreSQL Partial Unique Index `CREATE UNIQUE INDEX unique_active_store_assignment ON "BmsStoreAssignment" ("storeCode") WHERE "isActive" = true` untuk menjamin integritas data (1 toko hanya dipegang 1 BMS aktif) sekaligus menjaga audit log historis saat terjadi rotasi/mutasi toko.
- NIK BMS dinormalisasi ke format 8 karakter (`String(raw).padStart(8, '0')`) agar konsisten dengan `User.NIK` di database.
- Smart Fallback Matching by Name (`normalizeBmsName`): Jika NIK di Excel berbeda dengan NIK di DB namun nama BMS cocok, script otomatis mengaitkan penugasan menggunakan NIK asli yang ada di database tanpa mengubah data akun User sedikitpun.
- Fallback Toko Unassigned/Skipped: Toko yang belum memiliki BMS penanggung jawab aktif (unassigned/vacant) tetap dapat diakses dan dilaporkan oleh semua BMS di cabang terkait sebagai safety net operasional, sedangkan toko yang sudah memiliki BMS resmi tetap terkunci khusus untuk BMS tersebut.
- Membuka akses halaman `/dashboard/bms-performance` untuk ADMIN selain BMC dan BNM_MANAGER agar Admin dapat memonitor KPI preventif seluruh BMS dan cabang.

## Verification

- `npx tsx --test tests/**/*.test.ts`: 14/14 test cases pass (duration ~9.5s).
- Command Prisma dan script import database tidak dijalankan otomatis sesuai instruksi pembatasan pengguna.

## Remaining Work and Risks

- None (kode siap, database schema dan script import siap dieksekusi secara mandiri oleh user menggunakan panduan tutorial).
