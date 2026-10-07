# BMS Coverage Tab Hierarchy in Preventive Checklist

## Scope

- Menghapus menu "Performa BMS" dari sidebar Admin di section Monitoring.
- Menambahkan tab baru "Coverage BMS" di halaman Checklist Preventif (`/dashboard/preventive`), diposisikan sebagai tab pertama dan dijadikan tab default aktif ketika halaman diakses.
- Mengimplementasikan tampilan hierarki 3-level (Cabang ➔ BMS ➔ Toko) dengan expand on-demand, kartu summary KPI global, auto-expand untuk role BMC, dan quick search terintegrasi.
- Menambahkan server action `getBmsCoverageHierarchy` untuk agregasi data penugasan toko aktif dan status penyelesaian preventif per kuartal.

## Context and Sources

- Permintaan dan diskusi user untuk menyederhanakan sidebar Admin dan menyatukan monitoring preventif di satu pintu `/dashboard/preventive`.
- Plan: `docs/plans/2026-10-07-bms-coverage-tab-hierarchy-plan.md`
- Task tracker: `docs/plans/task.md`
- Aturan konteks arsitektur: `AI_CONTEXT.md` (Admin tidak melihat Performa BMS di sidebar).

## Changed Files

- `components/app-sidebar.tsx`: Mengembalikan kondisi pengecualian menu "Performa BMS" untuk role `ADMIN`.
- `app/dashboard/preventive/coverage-hierarchy-action.ts`: Server action agregasi data hierarki coverage BMS per cabang (Cabang -> BMS -> Toko).
- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: Komponen tabel hierarkis 3-level dengan chevron accordion, KPI cards, visual progress bar, dan filter toko per BMS.
- `app/dashboard/preventive/page.tsx`: Mendaftarkan `"coverage-bms"` ke `VALID_TABS`, menjadikannya default tab, dan meneruskan `initialCoverageHierarchy` ke komponen tabel.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Menambahkan trigger tab "Coverage BMS" di urutan pertama dan merender komponen hierarki di `TabsContent`.

## Decisions

- **Single Door for Preventive Monitoring:** Seluruh pemantauan preventif kini terpusat di `/dashboard/preventive`, menghindarkan redundansi menu di sidebar.
- **On-Demand Expandable Tree Architecture:** Level 2 (BMS) dan Level 3 (Toko) hanya dirender saat user mengklik baris Cabang / BMS terkait, menghemat beban DOM saat mengelola ribuan toko.
- **BMC Context Awareness:** Untuk user role `BMC`, cabang miliknya otomatis ter-expand secara default sejak awal render, sehingga BMC langsung melihat daftar BMS di bawah cabangnya tanpa klik tambahan.

## Verification

- `npx tsx --test tests/preventive/*.test.ts`: 5/5 unit tests lulus (100% PASS).
- `npm run build:memory`: Verifikasi typecheck, compiler, SSR, dan Next.js Turbopack build bersih tanpa error.

## Remaining Work and Risks

None. Seluruh perubahan telah diuji dan terintegrasi secara mulus.
