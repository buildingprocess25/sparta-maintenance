# Modular Dashboard Filters (Option 1)

## Scope

- Menerapkan arsitektur "Full Modular" pada Dashboard V2.
- Mengubah letak komponen `AdminTrendPeriodFilter`.
- Menjadikan komponen Realisasi mandiri (Client Component dengan Server Action).

## Context and Sources

- Brainstorming bersama user menyepakati bahwa Option 1 (Widget-Based / Full Modular) lebih baik secara UX dibandingkan Option 2 yang terlalu tersentralisasi dan memaksa quarter mapping.

## Changed Files

- `app/dashboard/_components/admin/admin-trend-filter.tsx`: Tambah flag `showPeriodFilter`.
- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Relokasi filter period ke header Ringkasan Operasional.
- `app/dashboard/queries.ts`: Menambahkan dukungan format filter period dan quarter.
- `app/dashboard/actions.ts`: Membuat Server Action `fetchAdminRealisasiDetailAction`.
- `app/dashboard/_components/admin/realisasi-chart-widget.tsx`: Memindahkan Realisasi chart menjadi widget client component mandiri.

## Decisions

- Data fetching Rata-Rata Realisasi dipisahkan menggunakan Server Action untuk menghindari Next.js Server-Side Waterfalls, sejalan dengan Vercel React Best Practices.

## Verification

- Komponen-komponen independen dan fungsional.

## Remaining Work and Risks

- None.
