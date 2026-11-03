# Kerusakan Berulang

## Scope

Halaman baru `/dashboard/recurring-damage` (Admin, BMC, BNM): toko dengan
item checklist yang sama rusak ≥ 2x per periode, drill-down Cabang → Toko →
Item → Laporan, dan export XLSX. Tanpa perubahan schema. Akses BMS, Branch
Admin, dan metrik "rusak lagi setelah diperbaiki" di luar cakupan.

## Context and Sources

- Spec: `docs/superpowers/specs/2026-11-03-recurring-damage-design.md`
- Plan: `docs/superpowers/plans/2026-11-03-recurring-damage.md`
- Pola acuan: `app/dashboard/preventive/` dan
  `app/api/dashboard/preventive/annual-matrix-export/route.ts`

## Changed Files

- `lib/recurring-damage.ts`: aturan deteksi rusak, status yang dihitung, filter periode, agregasi toko problematik, dan ringkasan cabang.
- `lib/recurring-damage.spec.ts`: spec fungsi murni.
- `components/dashboard/metric-column.tsx`, `empty-table.tsx`, `report-status-badge.tsx`: komponen dipindah dari halaman Preventif tanpa perubahan markup.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: memakai komponen bersama, salinan lokal dihapus.

## Decisions

- Deteksi rusak memakai aturan yang sama dengan seluruh aplikasi
  (`RUSAK` / `NOT_OK`); signage Pudar ikut rusak.
- `ESTIMATION_REJECTED` dan `ARCHIVED_PREVENTIVE` tidak dihitung.
- Item teratas saat seri memakai urutan katalog (compareChecklistItemIds); ringkasan cabang diurutkan dari jumlah toko problematik terbanyak.

## Verification

- `npx tsx lib/recurring-damage.spec.ts`: lulus.
- `npx tsc --noEmit` (dicek terscope: 4 file TSX yang diubah/dibuat) dan eslint pada file Preventif: tanpa error baru.

## Remaining Work and Risks

- Query, halaman, dan export belum dibuat (task berikutnya).
