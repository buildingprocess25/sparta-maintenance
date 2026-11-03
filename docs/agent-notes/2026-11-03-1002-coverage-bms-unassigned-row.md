# Coverage BMS Unassigned Row & Vacate on BMS Delete

## Scope

Tabel Coverage BMS di `/dashboard/preventive` menampilkan total cabang yang sama
dengan card, plus baris "Belum di-assign BMS". Hapus user BMS otomatis
mengosongkan assignment tokonya. Tidak ada perubahan schema.

## Context and Sources

- Spec: `docs/superpowers/specs/2026-11-03-coverage-bms-unassigned-row-design.md`
- Plan: `docs/superpowers/plans/2026-11-03-coverage-bms-unassigned-row.md`
- Catatan terkait: `docs/agent-notes/2026-10-09-1342-sync-active-stores-bms-coverage.md`

## Changed Files

- `app/dashboard/preventive/coverage-hierarchy.ts`: fungsi murni `buildCoverageHierarchy` dan tipe hierarki coverage.
- `app/dashboard/preventive/coverage-hierarchy.spec.ts`: spec fungsi murni.
- `app/dashboard/preventive/coverage-hierarchy-action.ts`: query berangkat dari `Store` aktif + assignment aktif, laporan ikut membawa nama pembuat.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`, `bms-coverage-hierarchy-table.tsx`: import tipe dari `../coverage-hierarchy`.

## Decisions

- Total cabang dihitung dari toko unik agar sama dengan card dan tidak dobel hitung toko ber-assignment ganda.

## Verification

- `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`: lulus.
- `npx tsc --noEmit`: bersih.
- `npx eslint` pada file yang disentuh: 0 error; 3 warning lama (unused `Button`, `quarter`, `year`) di `bms-coverage-hierarchy-table.tsx`.

## Remaining Work and Risks

- Task 3–6 di plan belum dikerjakan.
