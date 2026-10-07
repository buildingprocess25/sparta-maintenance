# Remove Redundant KPI Cards from Coverage BMS Tab

## Scope

Menghapus kartu-kartu metrik summary KPI global (Total Cabang, BMS Terlibat, Target Toko, Sudah Checklist, Coverage Nasional) dari tab Coverage BMS pada halaman Checklist Preventif (`/dashboard/preventive`), sehingga hanya menyisakan toolbar search bar dan tabel hierarki preventif.

## Context and Sources

- Permintaan user untuk membersihkan card-card di tab Coverage BMS karena redundan dengan metrik bawaan di header halaman Checklist Preventif.
- Komponen: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`

## Changed Files

- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: Menghapus grid card KPI dan perhitungan `globalSummary`, merapikan margin/padding container.

## Decisions

- **Clean and Focused UI:** Menghilangkan redundansi visual kartu KPI di tab Coverage BMS agar user langsung fokus pada search bar dan penelusuran hierarki Cabang ➔ BMS ➔ Toko tanpa terdistraksi atau memakan vertikal space berlebih.

## Verification

- Hot-reload Next.js dev server berjalan tanpa runtime/compilation error.

## Remaining Work and Risks

None.
