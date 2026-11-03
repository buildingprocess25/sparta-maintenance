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
- `app/dashboard/recurring-damage/detections-query.ts`: query JSONB item rusak per toko/periode (tanpa cek akses).
- `app/dashboard/recurring-damage/queries.ts`: `loadRecurringDamage` dengan cek role dan cakupan cabang.

## Decisions

- Deteksi rusak memakai aturan yang sama dengan seluruh aplikasi
  (`RUSAK` / `NOT_OK`); signage Pudar ikut rusak.
- `ESTIMATION_REJECTED` dan `ARCHIVED_PREVENTIVE` tidak dihitung.
- Item teratas saat seri memakai urutan katalog (compareChecklistItemIds); ringkasan cabang diurutkan dari jumlah toko problematik terbanyak.

## Verification

- `npx tsx lib/recurring-damage.spec.ts`: lulus.
- `npx tsc --noEmit` (dicek terscope: 4 file TSX yang diubah/dibuat) dan eslint pada file Preventif: tanpa error baru.
- Task 4: tsc terscope (dua file baru + `lib/recurring-damage.ts`) dan eslint `app/dashboard/recurring-damage`: tanpa error.
- Script verifikasi sementara di DB lokal (2026): 22150 toko aktif, 45374 deteksi, 1431 toko problematik, durasi 3329 ms (run pertama, cache dingin) dan 2232 ms (run kedua), signage Pudar/Rusak di luar NOT_OK = 0. Script dihapus.

## Remaining Work and Risks

- Halaman dan export belum dibuat (task berikutnya).
- Durasi query deteksi setahun penuh untuk semua toko (~22 ribu kode di `IN`) 2,2-3,3 s di DB lokal, di atas target 2 s. EXPLAIN ANALYZE: Parallel Seq Scan `Report` (~21,9 ribu laporan setahun) + nested loop `jsonb_array_elements`; eksekusi 1,68 s, sebagian besar waktu di pembacaan halaman TOAST kolom `items` (read ~23,7 ribu buffer, cache dingin). Filter `storeCode IN` tidak selektif untuk Admin semua cabang. Opsi bila perlu: filter periode/cabang lebih sempit, atau cache hasil.
