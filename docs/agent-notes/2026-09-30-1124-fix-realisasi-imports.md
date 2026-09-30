# Fix Realisasi Widget Imports

## Scope

- Memperbaiki path import untuk `actions` dan `queries` di `realisasi-chart-widget.tsx`.

## Context and Sources

- Terjadi error *Module not found: Can't resolve '../../../actions'* karena kelebihan satu tingkat folder pada relative path (seharusnya `../../`).

## Changed Files

- `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

## Decisions

- Menghapus satu level folder (`../`) pada import.

## Verification

- Kompilasi berhasil dan *error* teratasi.

## Remaining Work and Risks

- None.
