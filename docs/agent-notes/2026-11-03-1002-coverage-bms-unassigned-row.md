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
- `app/dashboard/preventive/_components/unassigned-coverage-rows.tsx`: baris "Belum di-assign BMS" dan rincian tokonya.
- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: prop `canManageStores`, pencarian toko unassigned, render baris unassigned.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: kirim `canManageStores` (Admin/BMC).
- `lib/bms-store-assignment.ts` (+ spec): helper `vacateBmsAssignments`.
- `app/admin/database/actions.ts` (`adminDeleteUser`), `app/bmc/database/actions.ts` (`deleteUser`): hapus user BMS menonaktifkan assignment tokonya dalam transaksi yang sama.

## Decisions

- Total cabang dihitung dari toko unik agar sama dengan card dan tidak dobel hitung toko ber-assignment ganda.
- Transaksi hapus user diubah ke bentuk interactive agar jumlah assignment yang dikosongkan bisa dicatat di log.

## Verification

- `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`: lulus.
- `npx tsc --noEmit`: bersih.
- `npx eslint` pada file yang disentuh: 0 error; 3 warning lama (unused `Button`, `quarter`, `year`) di `bms-coverage-hierarchy-table.tsx`.
- Cek data read-only di DB lokal via script sementara (`getBmsCoverageHierarchy`): total cabang CIANJUR = jumlah toko aktif cabang (sama dengan card) di Q1–Q4 2026; completed cabang = hitung ulang toko unik selesai; semua toko unassigned yang selesai punya `doneByName`; jumlah total semua cabang = jumlah toko aktif non-HEAD OFFICE.
- `npx tsx lib/bms-store-assignment.spec.ts`: lulus.
- Helper dijalankan di DB lokal di dalam transaksi yang di-rollback: semua assignment aktif satu BMS jadi nonaktif dengan `notes` benar; setelah rollback data kembali utuh.
- Cek hapus user lewat UI belum dilakukan (tidak ada akun uji lokal).
- Cek visual di browser belum dilakukan: tidak ada akun uji lokal dengan password yang diketahui.

## Remaining Work and Risks

- Task 5–6 di plan belum dikerjakan.
